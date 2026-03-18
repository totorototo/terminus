import { memo } from "react";

import PropTypes from "prop-types";

import { useSoundscape } from "../../hooks/useSoundscape.js";

import style from "./Soundscape.style.js";

const LABELS = {
  idle: "No route loaded",
  generating: "Generating...",
  ready: "Play Soundscape",
  playing: "Stop",
  error: "Unavailable",
};

const Soundscape = memo(function Soundscape({ className }) {
  const { soundState, play, stop } = useSoundscape();

  const isPlaying = soundState === "playing";
  const isDisabled =
    soundState === "idle" ||
    soundState === "generating" ||
    soundState === "error";

  function handleClick() {
    if (isPlaying) stop();
    else play();
  }

  return (
    <div className={className}>
      <div className="soundscape-header">
        <span className="header-label">Soundscape</span>
      </div>

      <button
        className={`play-button ${isPlaying ? "active" : ""}`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={isPlaying ? "Stop soundscape" : "Play soundscape"}
      >
        <span className="play-icon">{isPlaying ? "■" : "▶"}</span>
        <span className="play-label">{LABELS[soundState]}</span>
        {isPlaying && <span className="playing-badge">live</span>}
      </button>

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
