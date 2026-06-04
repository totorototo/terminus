import { memo, useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../../../store/store.js";

import style from "./PaceSettings.style.js";

/**
 * Named pace presets. The numeric `value` (seconds per km on flat terrain) is
 * what gets stored and used for ETA computation; the label is what the user
 * sees and selects.
 */
export const PACE_OPTIONS = [
  { label: "Slow", value: 600 },
  { label: "Moderate", value: 500 },
  { label: "Quite fast", value: 400 },
  { label: "Fast", value: 300 },
];

/**
 * Named fatigue presets. The numeric `value` (cumulative fatigue coefficient)
 * is stored and used under the hood; the label is shown to the user.
 * Values are calibrated for the exponential fatigue model exp(k·d_eff_km).
 * Equal k steps give roughly equal proportional slowdown increments per preset.
 */
export const FATIGUE_OPTIONS = [
  { label: "Low", value: 0.001 },
  { label: "Moderate", value: 0.002 },
  { label: "High", value: 0.003 },
  { label: "Very high", value: 0.004 },
];

/**
 * Planned stop duration at each LifeBase checkpoint.
 * The numeric `value` is seconds; the label is shown to the user.
 */
export const LIFE_BASE_STOP_OPTIONS = [
  { label: "None", value: 0 },
  { label: "30 min", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "2 hours", value: 7200 },
];

/** Pick the option whose numeric value is closest to the stored value. */
export function closestOption(options, value) {
  return options.reduce((best, opt) =>
    Math.abs(opt.value - value) < Math.abs(best.value - value) ? opt : best,
  );
}

const PaceSettings = memo(function PaceSettings({ className }) {
  const { paceSettings, setPaceSettings, reprocessGPXFile, isFollower } =
    useStore(
      useShallow((state) => ({
        paceSettings: state.app?.paceSettings ?? {
          basePaceSPerKm: 500,
          kFatigue: 0.002,
          lifeBaseStopS: 3600,
        },
        setPaceSettings: state.setPaceSettings ?? (() => {}),
        reprocessGPXFile: state.reprocessGPXFile ?? (() => {}),
        // Follower mode: connected to a runner's session (not broadcasting)
        isFollower: state.gps?.followerConnectionStatus === "connected",
      })),
    );

  const { basePaceSPerKm, kFatigue, lifeBaseStopS } = paceSettings;

  const selectedPace = closestOption(PACE_OPTIONS, basePaceSPerKm);
  const selectedFatigue = closestOption(FATIGUE_OPTIONS, kFatigue);
  const selectedStop = closestOption(
    LIFE_BASE_STOP_OPTIONS,
    lifeBaseStopS ?? 3600,
  );

  const handlePaceChange = useCallback(
    (value) => {
      setPaceSettings({ basePaceSPerKm: value });
      reprocessGPXFile();
    },
    [setPaceSettings, reprocessGPXFile],
  );

  const handleFatigueChange = useCallback(
    (value) => {
      setPaceSettings({ kFatigue: value });
      reprocessGPXFile();
    },
    [setPaceSettings, reprocessGPXFile],
  );

  const handleStopChange = useCallback(
    (value) => {
      setPaceSettings({ lifeBaseStopS: value });
      reprocessGPXFile();
    },
    [setPaceSettings, reprocessGPXFile],
  );

  return (
    <div className={className}>
      <div className="settings-header">
        <span className="header-label">Pace &amp; Effort</span>
        {isFollower && <span className="synced-badge">synced from runner</span>}
      </div>

      <div className="settings-body">
        <div className="setting-row">
          <div className="setting-label-row">
            <span className="setting-name">Base pace</span>
          </div>
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Base flat-terrain pace"
          >
            {PACE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={opt.value === selectedPace.value}
                className={
                  opt.value === selectedPace.value
                    ? "segment active"
                    : "segment"
                }
                onClick={() => handlePaceChange(opt.value)}
                disabled={isFollower}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-label-row">
            <span className="setting-name">Fatigue</span>
          </div>
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Cumulative fatigue coefficient"
          >
            {FATIGUE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={opt.value === selectedFatigue.value}
                className={
                  opt.value === selectedFatigue.value
                    ? "segment active"
                    : "segment"
                }
                onClick={() => handleFatigueChange(opt.value)}
                disabled={isFollower}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-label-row">
            <span className="setting-name">LifeBase stop</span>
          </div>
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Planned stop duration at each LifeBase checkpoint"
          >
            {LIFE_BASE_STOP_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={opt.value === selectedStop.value}
                className={
                  opt.value === selectedStop.value
                    ? "segment active"
                    : "segment"
                }
                onClick={() => handleStopChange(opt.value)}
                disabled={isFollower}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <p className="settings-hint">
          {isFollower
            ? "These settings are automatically synced from the runner and cannot be changed."
            : "Adjusts ETA predictions for all checkpoints. Followers will automatically receive your settings."}
        </p>
      </div>
    </div>
  );
});

export default style(PaceSettings);
