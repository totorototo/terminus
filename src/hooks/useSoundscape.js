import { useCallback, useEffect, useRef, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../store/store.js";

const DURATION_S = 60;
const FREQ_MIN = 110; // A2 — low elevation
const FREQ_MAX = 880; // A5 — high elevation (3 octaves up)

// ── WAV export ────────────────────────────────────────────────────────────────

function buildAudioGraph(ctx, frames) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  filter.type = "lowpass";
  filter.Q.value = 1.5;

  osc.connect(gain);
  gain.connect(filter);
  filter.connect(ctx.destination);

  const now = ctx.currentTime;

  osc.frequency.setValueAtTime(toFreq(frames[0].pitch), now);
  gain.gain.setValueAtTime(0.001, now);
  filter.frequency.setValueAtTime(toFilterFreq(frames[0].tempo), now);
  gain.gain.linearRampToValueAtTime(toGain(frames[0].intensity), now + 0.8);

  for (const f of frames) {
    const t = now + f.t * DURATION_S;
    osc.frequency.linearRampToValueAtTime(toFreq(f.pitch), t);
    gain.gain.linearRampToValueAtTime(toGain(f.intensity), t);
    filter.frequency.linearRampToValueAtTime(toFilterFreq(f.tempo), t);
  }

  gain.gain.linearRampToValueAtTime(0.001, now + DURATION_S);
  osc.start(now);
  osc.stop(now + DURATION_S);

  return osc;
}

async function renderToWav(frames) {
  const sampleRate = 44100;
  const numSamples = Math.ceil(DURATION_S * sampleRate);
  const offCtx = new OfflineAudioContext(1, numSamples, sampleRate);

  buildAudioGraph(offCtx, frames);
  const audioBuffer = await offCtx.startRendering();

  // Encode PCM 16-bit mono WAV
  const pcm = audioBuffer.getChannelData(0);
  const ab = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(ab);

  function str(off, s) {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  }

  str(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }

  return ab;
}

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
  const analyserRef = useRef(null);
  const startTimeRef = useRef(null);

  // "stopped" | "playing" | "paused"
  const [playbackState, setPlaybackState] = useState("stopped");
  const [genRecord, setGenRecord] = useState({ key: null, status: "ready" });
  const [isDownloading, setIsDownloading] = useState(false);

  const { gpxData, gpxSlopes, gpxDistances, workerGenerateAudioFrames } =
    useStore(
      useShallow((s) => ({
        gpxData: s.gpx.data,
        gpxSlopes: s.gpx.slopes,
        gpxDistances: s.gpx.cumulativeDistances,
        workerGenerateAudioFrames: s.workerGenerateAudioFrames,
      })),
    );

  // Expose raw GPX data for live stats in visualisation
  const gpxDataRef = useRef(gpxData);
  const gpxSlopesRef = useRef(gpxSlopes);
  const gpxDistancesRef = useRef(gpxDistances);
  gpxDataRef.current = gpxData;
  gpxSlopesRef.current = gpxSlopes;
  gpxDistancesRef.current = gpxDistances;

  const hasData = Boolean(
    gpxData?.length && gpxSlopes?.length && gpxDistances?.length,
  );

  // Stable fingerprint of the current route — changes when a new GPX is loaded
  const dataKey = hasData
    ? `${gpxData.length}-${gpxDistances[gpxDistances.length - 1]?.toFixed(0)}`
    : null;

  // Derive soundState:
  //   "idle"       — no route loaded
  //   "generating" — route loaded, frames not yet ready for this data key
  //   "ready"      — frames ready, can play
  //   "playing"    — audio is playing
  //   "paused"     — audio suspended, can resume or stop
  //   "error"      — generation failed
  const soundState = !hasData
    ? "idle"
    : playbackState === "playing"
      ? "playing"
      : playbackState === "paused"
        ? "paused"
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

  // Shared teardown — does NOT update state (callers do that)
  function teardown() {
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
    analyserRef.current = null;
    startTimeRef.current = null;
  }

  // Shared startup — builds and starts the audio graph from scratch
  function startAudio() {
    const frames = framesRef.current;
    if (!frames?.length) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    startTimeRef.current = ctx.currentTime;

    osc.type = "sine";
    filter.type = "lowpass";
    filter.Q.value = 1.5;

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(analyser);
    analyser.connect(ctx.destination);

    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(toFreq(frames[0].pitch), now);
    gain.gain.setValueAtTime(0.001, now);
    filter.frequency.setValueAtTime(toFilterFreq(frames[0].tempo), now);
    gain.gain.linearRampToValueAtTime(toGain(frames[0].intensity), now + 0.8);

    for (const f of frames) {
      const t = now + f.t * DURATION_S;
      osc.frequency.linearRampToValueAtTime(toFreq(f.pitch), t);
      gain.gain.linearRampToValueAtTime(toGain(f.intensity), t);
      filter.frequency.linearRampToValueAtTime(toFilterFreq(f.tempo), t);
    }

    gain.gain.linearRampToValueAtTime(0.001, now + DURATION_S);
    osc.start(now);
    osc.stop(now + DURATION_S);
    osc.onended = () => setPlaybackState("stopped");

    oscRef.current = osc;
  }

  const play = useCallback(() => {
    if (soundState !== "ready") return;
    startAudio();
    setPlaybackState("playing");
  }, [soundState]);

  const pause = useCallback(() => {
    if (audioCtxRef.current?.state === "running") {
      audioCtxRef.current.suspend();
      setPlaybackState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
      setPlaybackState("playing");
    }
  }, []);

  const stop = useCallback(() => {
    teardown();
    setPlaybackState("stopped");
  }, []);

  const restart = useCallback(() => {
    if (!framesRef.current?.length) return;
    teardown();
    startAudio();
    setPlaybackState("playing");
  }, []);

  const download = useCallback(async () => {
    const frames = framesRef.current;
    if (!frames?.length || isDownloading) return;
    setIsDownloading(true);
    try {
      const wav = await renderToWav(frames);
      const blob = new Blob([wav], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "soundscape.wav";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardown();
    };
  }, []);

  return {
    soundState,
    play,
    pause,
    resume,
    stop,
    restart,
    download,
    isDownloading,
    analyserRef,
    audioCtxRef,
    startTimeRef,
    framesRef,
    gpxDataRef,
    gpxSlopesRef,
    gpxDistancesRef,
  };
}
