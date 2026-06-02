import { memo, useCallback, useState } from "react";

import { RotateCcw } from "@styled-icons/feather/RotateCcw";
import { useShallow } from "zustand/react/shallow";

import {
  BASE_PACE_STEP_S_PER_KM,
  K_FATIGUE_STEP,
  MAX_BASE_PACE_S_PER_KM,
  MAX_K_FATIGUE,
  MIN_BASE_PACE_S_PER_KM,
  MIN_K_FATIGUE,
} from "../../../constants.js";
import useStore from "../../../store/store.js";

import style from "./PaceSettings.style.js";

// Format a pace in seconds-per-km as mm:ss/km (e.g. 530 → "8:50/km").
function formatPace(secondsPerKm) {
  const total = Math.round(secondsPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

const PaceSettings = memo(function PaceSettings({ className }) {
  const { basePace, kFatigue, setBasePace, setKFatigue, resetPaceSettings } =
    useStore(
      useShallow((state) => ({
        basePace: state.settings.basePace,
        kFatigue: state.settings.kFatigue,
        setBasePace: state.setBasePace,
        setKFatigue: state.setKFatigue,
        resetPaceSettings: state.resetPaceSettings,
      })),
    );

  // Local drafts give instant slider feedback; the store (which triggers an
  // expensive GPX re-process) is only updated when the user releases the slider.
  const [paceDraft, setPaceDraft] = useState(basePace);
  const [fatigueDraft, setFatigueDraft] = useState(kFatigue);

  // Keep drafts in sync when the store changes externally (e.g. reset,
  // rehydrate) using the "adjust state during render" pattern.
  const [prevBasePace, setPrevBasePace] = useState(basePace);
  if (basePace !== prevBasePace) {
    setPrevBasePace(basePace);
    setPaceDraft(basePace);
  }
  const [prevKFatigue, setPrevKFatigue] = useState(kFatigue);
  if (kFatigue !== prevKFatigue) {
    setPrevKFatigue(kFatigue);
    setFatigueDraft(kFatigue);
  }

  const commitPace = useCallback(
    () => setBasePace(paceDraft),
    [setBasePace, paceDraft],
  );
  const commitFatigue = useCallback(
    () => setKFatigue(fatigueDraft),
    [setKFatigue, fatigueDraft],
  );

  return (
    <div className={className}>
      <div className="settings-header">
        <span className="header-label">Effort model</span>
        <button
          type="button"
          className="reset-btn"
          onClick={resetPaceSettings}
          aria-label="Reset effort settings to defaults"
          title="Reset to defaults"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      <label className="field" htmlFor="pace-base">
        <span className="field-label">
          Base pace
          <strong>{formatPace(paceDraft)}</strong>
        </span>
        <input
          id="pace-base"
          type="range"
          min={MIN_BASE_PACE_S_PER_KM}
          max={MAX_BASE_PACE_S_PER_KM}
          step={BASE_PACE_STEP_S_PER_KM}
          value={paceDraft}
          onChange={(e) => setPaceDraft(Number(e.target.value))}
          onPointerUp={commitPace}
          onKeyUp={commitPace}
          onBlur={commitPace}
          aria-valuetext={formatPace(paceDraft)}
        />
        <span className="field-hint">Flat-terrain reference pace.</span>
      </label>

      <label className="field" htmlFor="pace-fatigue">
        <span className="field-label">
          Fatigue
          <strong>{fatigueDraft.toFixed(4)}</strong>
        </span>
        <input
          id="pace-fatigue"
          type="range"
          min={MIN_K_FATIGUE}
          max={MAX_K_FATIGUE}
          step={K_FATIGUE_STEP}
          value={fatigueDraft}
          onChange={(e) => setFatigueDraft(Number(e.target.value))}
          onPointerUp={commitFatigue}
          onKeyUp={commitFatigue}
          onBlur={commitFatigue}
          aria-valuetext={`Fatigue ${fatigueDraft.toFixed(4)}`}
        />
        <span className="field-hint">Higher values slow later sections.</span>
      </label>
    </div>
  );
});

export default style(PaceSettings);
