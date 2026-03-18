import { useCallback, useEffect, useRef, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../store/store.js";

const DURATION_S = 60;
const FREQ_MIN = 110; // A2 — low elevation
const FREQ_MAX = 880; // A5 — high elevation (3 octaves up)

function toFreq(pitch) {
  return FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, pitch);
}

function toGain(intensity) {
  return 0.05 + intensity * 0.35;
}

function toFilterFreq(tempo) {
  return 300 + tempo * 3700;
}

export function useSoundscape() {
  const framesRef = useRef(null);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);

  // Tracks the result of each generation attempt keyed by data fingerprint.
  // State is only set in async callbacks — never synchronously in the effect body.
  const [genRecord, setGenRecord] = useState({ key: null, status: "ready" });
  const [isPlaying, setIsPlaying] = useState(false);

  const { gpxData, gpxSlopes, gpxDistances, workerGenerateAudioFrames } =
    useStore(
      useShallow((s) => ({
        gpxData: s.gpx.data,
        gpxSlopes: s.gpx.slopes,
        gpxDistances: s.gpx.cumulativeDistances,
        workerGenerateAudioFrames: s.workerGenerateAudioFrames,
      })),
    );

  const hasData = Boolean(
    gpxData?.length && gpxSlopes?.length && gpxDistances?.length,
  );

  // Stable fingerprint of the current route — changes when a new GPX is loaded
  const dataKey = hasData
    ? `${gpxData.length}-${gpxDistances[gpxDistances.length - 1]?.toFixed(0)}`
    : null;

  // Derive soundState — no synchronous setState needed for loading/idle transitions:
  //   "idle"       — no route loaded
  //   "generating" — route loaded, frames not yet ready for this data key
  //   "ready"      — frames ready, can play
  //   "playing"    — audio is playing
  //   "error"      — generation failed
  const soundState = !hasData
    ? "idle"
    : isPlaying
      ? "playing"
      : genRecord.key !== dataKey
        ? "generating"
        : genRecord.status; // "ready" | "error"

  useEffect(() => {
    if (!hasData || !dataKey) {
      framesRef.current = null;
      return;
    }

    let cancelled = false;
    framesRef.current = null;

    const elevations = gpxData.map((p) => p[2]);

    workerGenerateAudioFrames(elevations, gpxDistances, gpxSlopes)
      .then((frames) => {
        if (cancelled) return;
        framesRef.current = frames;
        setGenRecord({ key: dataKey, status: "ready" });
      })
      .catch(() => {
        if (!cancelled) setGenRecord({ key: dataKey, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasData,
    dataKey,
    gpxData,
    gpxSlopes,
    gpxDistances,
    workerGenerateAudioFrames,
  ]);

  const play = useCallback(() => {
    if (soundState !== "ready" || !framesRef.current?.length) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    filter.type = "lowpass";
    filter.Q.value = 1.5;

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(ctx.destination);

    const frames = framesRef.current;
    const now = ctx.currentTime;

    // Seed initial values before ramping
    osc.frequency.setValueAtTime(toFreq(frames[0].pitch), now);
    gain.gain.setValueAtTime(0.001, now);
    filter.frequency.setValueAtTime(toFilterFreq(frames[0].tempo), now);

    // Soft attack
    gain.gain.linearRampToValueAtTime(toGain(frames[0].intensity), now + 0.8);

    // Schedule all frame transitions
    for (const f of frames) {
      const t = now + f.t * DURATION_S;
      osc.frequency.linearRampToValueAtTime(toFreq(f.pitch), t);
      gain.gain.linearRampToValueAtTime(toGain(f.intensity), t);
      filter.frequency.linearRampToValueAtTime(toFilterFreq(f.tempo), t);
    }

    // Soft release
    gain.gain.linearRampToValueAtTime(0.001, now + DURATION_S);

    osc.start(now);
    osc.stop(now + DURATION_S);
    osc.onended = () => setIsPlaying(false);

    oscRef.current = osc;
    setIsPlaying(true);
  }, [soundState]);

  const stop = useCallback(() => {
    if (oscRef.current) {
      oscRef.current.onended = null;
      try {
        oscRef.current.stop();
      } catch {
        // already stopped
      }
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch {
          // already stopped
        }
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return { soundState, play, stop };
}
