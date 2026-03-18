import { memo, useEffect, useRef } from "react";

import PropTypes from "prop-types";

import { useSoundscape } from "../../hooks/useSoundscape.js";

import style from "./Soundscape.style.js";

const DURATION_S = 60;
const VB_W = 256;
const VB_H = 44;

// Binary search: first index where distances[i] >= target
function findIndexAtDistance(distances, target) {
  let lo = 0;
  let hi = distances.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (distances[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const Soundscape = memo(function Soundscape({ className }) {
  const {
    soundState,
    play,
    pause,
    resume,
    stop,
    restart,
    analyserRef,
    audioCtxRef,
    startTimeRef,
    framesRef,
    gpxDataRef,
    gpxSlopesRef,
    gpxDistancesRef,
  } = useSoundscape();

  const rafRef = useRef(null);
  const waveformRef = useRef(null);
  const progressBarRef = useRef(null);
  const elevRef = useRef(null);
  const slopeRef = useRef(null);
  const progressRef = useRef(null);
  const bufRef = useRef(null);

  const isPlaying = soundState === "playing";
  const isPaused = soundState === "paused";
  const isActive = isPlaying || isPaused;
  const isLoading =
    soundState === "idle" ||
    soundState === "generating" ||
    soundState === "error";

  // RAF loop — only runs while playing (not paused)
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (!isPaused) {
        waveformRef.current?.setAttribute("d", "");
        progressBarRef.current?.setAttribute("width", "0");
      }
      return;
    }

    function draw() {
      const analyser = analyserRef.current;
      const audioCtx = audioCtxRef.current;
      if (!analyser || !audioCtx) return;

      if (!bufRef.current || bufRef.current.length !== analyser.fftSize) {
        bufRef.current = new Uint8Array(analyser.fftSize);
      }
      analyser.getByteTimeDomainData(bufRef.current);
      const buf = bufRef.current;
      const len = buf.length;

      // Waveform path
      let d = `M0,${(buf[0] / 255) * VB_H}`;
      for (let i = 1; i < len; i++) {
        d += `L${(i / (len - 1)) * VB_W},${(buf[i] / 255) * VB_H}`;
      }
      waveformRef.current?.setAttribute("d", d);

      // Progress bar
      const t = Math.min(
        1,
        (audioCtx.currentTime - (startTimeRef.current ?? 0)) / DURATION_S,
      );
      progressBarRef.current?.setAttribute("width", t * VB_W);

      // Live stats
      const frames = framesRef.current;
      if (frames?.length) {
        let fi = 0;
        for (let i = 0; i < frames.length; i++) {
          if (frames[i].t <= t) fi = i;
        }
        const frame = frames[fi];

        if (progressRef.current) {
          progressRef.current.textContent = `${(frame.distance * 100).toFixed(0)}%`;
        }

        const distances = gpxDistancesRef.current;
        const gpxData = gpxDataRef.current;
        const slopes = gpxSlopesRef.current;
        if (distances?.length && gpxData?.length) {
          const totalDist = distances[distances.length - 1];
          const idx = findIndexAtDistance(
            distances,
            frame.distance * totalDist,
          );

          if (elevRef.current) {
            const elev = gpxData[idx]?.[2];
            elevRef.current.textContent =
              elev != null ? `${Math.round(elev)}m` : "--";
          }
          if (slopeRef.current && slopes?.length) {
            const slope = slopes[idx];
            slopeRef.current.textContent =
              slope != null ? `${slope.toFixed(1)}%` : "--";
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    isPlaying,
    isPaused,
    analyserRef,
    audioCtxRef,
    startTimeRef,
    framesRef,
    gpxDataRef,
    gpxSlopesRef,
    gpxDistancesRef,
  ]);

  return (
    <div className={className}>
      <div className="soundscape-header">
        <span className="header-label">Soundscape</span>
        {isActive && <span className="live-badge">live</span>}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className="ctrl-btn"
          onClick={restart}
          disabled={isLoading || (!isActive && soundState !== "ready")}
          aria-label="Restart"
          title="Restart"
        >
          ↺
        </button>

        {isPlaying ? (
          <button
            className="ctrl-btn ctrl-primary active"
            onClick={pause}
            aria-label="Pause"
            title="Pause"
          >
            ‖
          </button>
        ) : (
          <button
            className={`ctrl-btn ctrl-primary${isPaused ? " active" : ""}`}
            onClick={isPaused ? resume : play}
            disabled={isLoading || (!isPaused && soundState !== "ready")}
            aria-label={isPaused ? "Resume" : "Play"}
            title={isPaused ? "Resume" : "Play"}
          >
            ▶
          </button>
        )}

        <button
          className="ctrl-btn"
          onClick={stop}
          disabled={!isActive}
          aria-label="Stop"
          title="Stop"
        >
          ■
        </button>
      </div>

      {/* Oscilloscope */}
      <svg
        className={`oscilloscope${isActive ? " visible" : ""}`}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          className="osc-midline"
          x1="0"
          y1={VB_H / 2}
          x2={VB_W}
          y2={VB_H / 2}
        />
        <path className="osc-waveform" ref={waveformRef} />
        <rect
          className="osc-progress"
          ref={progressBarRef}
          x="0"
          y={VB_H - 2}
          width="0"
          height="2"
        />
      </svg>

      {/* Live stats */}
      <div className={`live-stats${isActive ? " visible" : ""}`}>
        <div className="live-stat">
          <span className="live-stat-label">elev</span>
          <span className="live-stat-value" ref={elevRef}>
            --
          </span>
        </div>
        <div className="live-stat-divider" />
        <div className="live-stat">
          <span className="live-stat-label">slope</span>
          <span className="live-stat-value" ref={slopeRef}>
            --
          </span>
        </div>
        <div className="live-stat-divider" />
        <div className="live-stat">
          <span className="live-stat-label">pos</span>
          <span className="live-stat-value" ref={progressRef}>
            --
          </span>
        </div>
      </div>

      <p className="soundscape-desc">
        Elevation → pitch · gradient → timbre · dynamism → brightness
      </p>
    </div>
  );
});

Soundscape.propTypes = {
  className: PropTypes.string,
};

export default style(Soundscape);
