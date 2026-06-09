import { memo, useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../../../store/store.js";

import style from "./PaceSettings.style.js";

/** Kept for EffortBreakdown backward compatibility. */
export const PACE_OPTIONS = [
  { label: "Casual", value: 600 },
  { label: "Trail", value: 500 },
  { label: "Athlete", value: 400 },
  { label: "Elite", value: 300 },
];

/** Kept for EffortBreakdown backward compatibility. */
export const FATIGUE_OPTIONS = [
  { label: "Low", value: 0.001 },
  { label: "Moderate", value: 0.002 },
  { label: "High", value: 0.003 },
  { label: "Very high", value: 0.004 },
];

/** Runner profiles — each bundles a pace and fatigue value. */
export const RUNNER_PROFILES = [
  {
    label: "Casual",
    basePaceSPerKm: 600,
    kFatigue: 0.004,
    sub: "~10 min/km on flat",
  },
  {
    label: "Trail",
    basePaceSPerKm: 500,
    kFatigue: 0.003,
    sub: "~8 min/km on flat",
  },
  {
    label: "Athlete",
    basePaceSPerKm: 400,
    kFatigue: 0.002,
    sub: "~7 min/km on flat",
  },
  {
    label: "Elite",
    basePaceSPerKm: 300,
    kFatigue: 0.001,
    sub: "~5 min/km on flat",
  },
];

export const LIFE_BASE_STOP_OPTIONS = [
  { label: "None", value: 0, sub: "No rest at checkpoints" },
  { label: "30 min", value: 1800, sub: "Quick stop at each LifeBase" },
  { label: "1 hour", value: 3600, sub: "Full rest at each LifeBase" },
  { label: "2 hours", value: 7200, sub: "Long rest at each LifeBase" },
];

/** Pick the option whose numeric value is closest to the stored value. */
export function closestOption(options, value) {
  return options.reduce((best, opt) =>
    Math.abs(opt.value - value) < Math.abs(best.value - value) ? opt : best,
  );
}

function closestProfile(basePaceSPerKm) {
  return RUNNER_PROFILES.reduce((best, p) =>
    Math.abs(p.basePaceSPerKm - basePaceSPerKm) <
    Math.abs(best.basePaceSPerKm - basePaceSPerKm)
      ? p
      : best,
  );
}

const PaceSettings = memo(function PaceSettings({ className }) {
  const { paceSettings, setPaceSettings, reprocessGPXFile, isFollower } =
    useStore(
      useShallow((state) => ({
        paceSettings: state.app?.paceSettings ?? {
          basePaceSPerKm: 500,
          kFatigue: 0.003,
          lifeBaseStopS: 3600,
        },
        setPaceSettings: state.setPaceSettings ?? (() => {}),
        reprocessGPXFile: state.reprocessGPXFile ?? (() => {}),
        isFollower: state.gps?.followerConnectionStatus === "connected",
      })),
    );

  const { basePaceSPerKm, lifeBaseStopS } = paceSettings;

  const selectedProfile = closestProfile(basePaceSPerKm);
  const selectedStop = closestOption(
    LIFE_BASE_STOP_OPTIONS,
    lifeBaseStopS ?? 3600,
  );

  const handleProfileChange = useCallback(
    (profile) => {
      setPaceSettings({
        basePaceSPerKm: profile.basePaceSPerKm,
        kFatigue: profile.kFatigue,
      });
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
          <span className="setting-name">Runner profile</span>
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Runner profile"
          >
            {RUNNER_PROFILES.map((profile) => (
              <button
                key={profile.label}
                type="button"
                role="radio"
                aria-checked={profile.label === selectedProfile.label}
                className={
                  profile.label === selectedProfile.label
                    ? "segment active"
                    : "segment"
                }
                onClick={() => handleProfileChange(profile)}
                disabled={isFollower}
              >
                <span className="segment-label">{profile.label}</span>
              </button>
            ))}
          </div>
          <p className="segment-hint">{selectedProfile.sub}</p>
        </div>

        <div className="setting-row">
          <span className="setting-name">LifeBase stop</span>
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
                <span className="segment-label">{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="segment-hint">{selectedStop.sub}</p>
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
