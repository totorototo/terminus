import { memo } from "react";

import { Pause } from "@styled-icons/feather/Pause";
import { Play } from "@styled-icons/feather/Play";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";

import style from "./FlythroughControls.style.js";

const SPEEDS = [0.5, 1, 2, 4];

const FlythroughControls = memo(function FlythroughControls({ className }) {
  const { isPlaying, speed } = useStore(
    useShallow((state) => ({
      isPlaying: state.app.flythroughIsPlaying,
      speed: state.app.flythroughSpeed,
    })),
  );
  const setIsPlaying = useStore((state) => state.setFlythroughIsPlaying);
  const setSpeed = useStore((state) => state.setFlythroughSpeed);

  return (
    <div className={className}>
      <button
        className="play-pause"
        onClick={() => setIsPlaying(!isPlaying)}
        aria-label={isPlaying ? "Pause flythrough" : "Play flythrough"}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <div className="speeds">
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`speed-btn${speed === s ? " active" : ""}`}
            onClick={() => setSpeed(s)}
            aria-label={`Set speed ${s}×`}
            aria-pressed={speed === s}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
});

export default style(FlythroughControls);
