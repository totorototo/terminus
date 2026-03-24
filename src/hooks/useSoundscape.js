import { useCallback, useEffect, useRef, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../store/store.js";

const DURATION_S = 60;
const FREQ_MIN = 110; // A2 — low elevation
const FREQ_MAX = 880; // A5 — high elevation (3 octaves up)
const DELAY_TIME = 0.18; // echo delay interval (seconds)

// ── Audio parameter helpers ────────────────────────────────────────────────────

function toFreq(pitch) {
  return FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, pitch);
}

function toGain(intensity) {
  return 0.05 + intensity * 0.35;
}

// Bearing (degrees) → PannerNode XZ position on unit circle.
// AudioListener faces -Z by default: north (0°) = ahead, east (90°) = right.
function bearingToXZ(deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.sin(rad), z: -Math.cos(rad) };
}

// LFO frequency from pace: slowest pace (1.0) → 0.5 Hz, fastest (0.0) → 3.0 Hz
function toLfoFreq(pace) {
  return 0.5 + (1 - pace) * 2.5;
}

// Filter Q from timbre: flat (0.5) → Q=1, steep ascent (1.0) → Q=9, descent (0.0) → Q=1
function toFilterQ(timbre) {
  return 1 + Math.abs(timbre - 0.5) * 2 * 8;
}

// Filter frequency: higher on ascent, lower on descent (brightness)
function toFilterFreq(timbre) {
  return 800 + timbre * 3200; // 800–4000 Hz
}

// Reverb wet mix from elevation: low → dry, high → echoing
function toWetGain(pitch) {
  return pitch * 0.45;
}

function toDryGain(pitch) {
  return 1 - pitch * 0.25;
}

// Echo feedback depth from elevation: more feedback at altitude (longer decay)
function toFeedbackGain(pitch) {
  return 0.15 + pitch * 0.4; // 0.15–0.55 (never reaches 1 to avoid runaway)
}

// ── WAV export (stereo) ────────────────────────────────────────────────────────

function buildAudioGraph(ctx, frames) {
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const mainGain = ctx.createGain();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const panner = ctx.createPanner();
  const delayNode = ctx.createDelay(1.0);
  const feedbackGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const dryGain = ctx.createGain();

  // Oscillator config
  osc.type = "sine";
  lfo.type = "sine";
  lfoGain.gain.value = 0.07; // subtle tremolo depth

  // Filter config (peaking EQ for timbre)
  filter.type = "peaking";
  filter.gain.value = 6;

  // HRTF panner config
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = 1;
  panner.rolloffFactor = 0; // gain handles amplitude — no distance rolloff

  // Echo delay
  delayNode.delayTime.value = DELAY_TIME;

  // Graph:
  // osc → mainGain → filter → panner → dryGain → destination
  //                                  → delayNode → feedbackGain → delayNode (loop)
  //                                              → wetGain → destination
  // lfo → lfoGain → mainGain.gain (tremolo)
  osc.connect(mainGain);
  mainGain.connect(filter);
  filter.connect(panner);
  panner.connect(dryGain);
  panner.connect(delayNode);
  dryGain.connect(ctx.destination);
  delayNode.connect(feedbackGain);
  delayNode.connect(wetGain);
  feedbackGain.connect(delayNode);
  wetGain.connect(ctx.destination);
  lfo.connect(lfoGain);
  lfoGain.connect(mainGain.gain);

  const now = ctx.currentTime;
  const f0 = frames[0];
  const { x: x0, z: z0 } = bearingToXZ(f0.bearing);

  // Initial values
  osc.frequency.setValueAtTime(toFreq(f0.pitch), now);
  mainGain.gain.setValueAtTime(0.001, now);
  mainGain.gain.linearRampToValueAtTime(toGain(f0.intensity), now + 0.8);
  filter.frequency.setValueAtTime(toFilterFreq(f0.timbre), now);
  filter.Q.setValueAtTime(toFilterQ(f0.timbre), now);
  panner.positionX.setValueAtTime(x0, now);
  panner.positionY.setValueAtTime(f0.pitch - 0.5, now);
  panner.positionZ.setValueAtTime(z0, now);
  dryGain.gain.setValueAtTime(toDryGain(f0.pitch), now);
  wetGain.gain.setValueAtTime(toWetGain(f0.pitch), now);
  feedbackGain.gain.setValueAtTime(toFeedbackGain(f0.pitch), now);
  lfo.frequency.setValueAtTime(toLfoFreq(f0.pace), now);

  for (const f of frames) {
    const t = now + f.t * DURATION_S;
    const { x, z } = bearingToXZ(f.bearing);
    osc.frequency.linearRampToValueAtTime(toFreq(f.pitch), t);
    mainGain.gain.linearRampToValueAtTime(toGain(f.intensity), t);
    filter.frequency.linearRampToValueAtTime(toFilterFreq(f.timbre), t);
    filter.Q.linearRampToValueAtTime(toFilterQ(f.timbre), t);
    panner.positionX.linearRampToValueAtTime(x, t);
    panner.positionY.linearRampToValueAtTime(f.pitch - 0.5, t);
    panner.positionZ.linearRampToValueAtTime(z, t);
    dryGain.gain.linearRampToValueAtTime(toDryGain(f.pitch), t);
    wetGain.gain.linearRampToValueAtTime(toWetGain(f.pitch), t);
    feedbackGain.gain.linearRampToValueAtTime(toFeedbackGain(f.pitch), t);
    lfo.frequency.linearRampToValueAtTime(toLfoFreq(f.pace), t);
  }

  mainGain.gain.linearRampToValueAtTime(0.001, now + DURATION_S);

  osc.start(now);
  osc.stop(now + DURATION_S);
  lfo.start(now);
  lfo.stop(now + DURATION_S);

  return osc;
}

async function renderToWav(frames) {
  const sampleRate = 44100;
  const numSamples = Math.ceil(DURATION_S * sampleRate);
  // Stereo (2 channels) for binaural HRTF output
  const offCtx = new OfflineAudioContext(2, numSamples, sampleRate);

  buildAudioGraph(offCtx, frames);
  const audioBuffer = await offCtx.startRendering();

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  // Stereo interleaved PCM 16-bit WAV
  const numChannels = 2;
  const blockAlign = numChannels * 2;
  const ab = new ArrayBuffer(44 + numSamples * blockAlign);
  const view = new DataView(ab);

  function str(off, s) {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  }

  str(0, "RIFF");
  view.setUint32(4, 36 + numSamples * blockAlign, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, numSamples * blockAlign, true);

  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(off, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    off += 2;
    view.setInt16(off, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    off += 2;
  }

  return ab;
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

  const {
    gpxData,
    gpxSlopes,
    gpxDistances,
    sections,
    workerGenerateAudioFrames,
  } = useStore(
    useShallow((s) => ({
      gpxData: s.gpx.data,
      gpxSlopes: s.gpx.slopes,
      gpxDistances: s.gpx.cumulativeDistances,
      sections: s.sections,
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

    workerGenerateAudioFrames(
      elevations,
      gpxDistances,
      gpxSlopes,
      sections ?? [],
    )
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
    sections,
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
    const lfo = ctx.createOscillator();
    const mainGain = ctx.createGain();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const panner = ctx.createPanner();
    const delayNode = ctx.createDelay(1.0);
    const feedbackGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    startTimeRef.current = ctx.currentTime;

    // Oscillator config
    osc.type = "sine";
    lfo.type = "sine";
    lfoGain.gain.value = 0.07;

    // Filter config
    filter.type = "peaking";
    filter.gain.value = 6;

    // HRTF panner
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.rolloffFactor = 0;

    delayNode.delayTime.value = DELAY_TIME;

    // Graph (analyser taps after dryGain for oscilloscope)
    osc.connect(mainGain);
    mainGain.connect(filter);
    filter.connect(panner);
    panner.connect(dryGain);
    panner.connect(delayNode);
    dryGain.connect(analyser);
    analyser.connect(ctx.destination);
    delayNode.connect(feedbackGain);
    delayNode.connect(wetGain);
    feedbackGain.connect(delayNode);
    wetGain.connect(ctx.destination);
    lfo.connect(lfoGain);
    lfoGain.connect(mainGain.gain);

    const now = ctx.currentTime;
    const f0 = frames[0];
    const { x: x0, z: z0 } = bearingToXZ(f0.bearing);

    osc.frequency.setValueAtTime(toFreq(f0.pitch), now);
    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(toGain(f0.intensity), now + 0.8);
    filter.frequency.setValueAtTime(toFilterFreq(f0.timbre), now);
    filter.Q.setValueAtTime(toFilterQ(f0.timbre), now);
    panner.positionX.setValueAtTime(x0, now);
    panner.positionY.setValueAtTime(f0.pitch - 0.5, now);
    panner.positionZ.setValueAtTime(z0, now);
    dryGain.gain.setValueAtTime(toDryGain(f0.pitch), now);
    wetGain.gain.setValueAtTime(toWetGain(f0.pitch), now);
    feedbackGain.gain.setValueAtTime(toFeedbackGain(f0.pitch), now);
    lfo.frequency.setValueAtTime(toLfoFreq(f0.pace), now);

    for (const f of frames) {
      const t = now + f.t * DURATION_S;
      const { x, z } = bearingToXZ(f.bearing);
      osc.frequency.linearRampToValueAtTime(toFreq(f.pitch), t);
      mainGain.gain.linearRampToValueAtTime(toGain(f.intensity), t);
      filter.frequency.linearRampToValueAtTime(toFilterFreq(f.timbre), t);
      filter.Q.linearRampToValueAtTime(toFilterQ(f.timbre), t);
      panner.positionX.linearRampToValueAtTime(x, t);
      panner.positionY.linearRampToValueAtTime(f.pitch - 0.5, t);
      panner.positionZ.linearRampToValueAtTime(z, t);
      dryGain.gain.linearRampToValueAtTime(toDryGain(f.pitch), t);
      wetGain.gain.linearRampToValueAtTime(toWetGain(f.pitch), t);
      feedbackGain.gain.linearRampToValueAtTime(toFeedbackGain(f.pitch), t);
      lfo.frequency.linearRampToValueAtTime(toLfoFreq(f.pace), t);
    }

    mainGain.gain.linearRampToValueAtTime(0.001, now + DURATION_S);

    osc.start(now);
    osc.stop(now + DURATION_S);
    lfo.start(now);
    lfo.stop(now + DURATION_S);
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
