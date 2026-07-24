import { memo, useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../../../store/store.js";
import {
  closestOption,
  LIFE_BASE_STOP_OPTIONS,
  RUNNER_PROFILES,
} from "./PaceSettings.constants.js";

import style from "./PaceSettings.style.js";

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
          basePaceSPerKm: 365,
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

const StyledPaceSettings = style(PaceSettings);

export default StyledPaceSettings;
