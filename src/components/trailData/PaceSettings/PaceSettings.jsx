import { memo, useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../../../store/store.js";

import style from "./PaceSettings.style.js";

/** Format seconds-per-km as "mm:ss /km" */
function formatPace(sPerKm) {
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

/** Display k_fatigue as a named profile */
function fatigueName(k) {
  if (k <= 0.002) return "Sprint / 50 km";
  if (k <= 0.006) return "Ultra / 100 km";
  if (k <= 0.01) return "Ultra / 150 km";
  return "Ultra / 200 km+";
}

const PaceSettings = memo(function PaceSettings({ className }) {
  const { paceSettings, setPaceSettings, reprocessGPXFile, isFollower } =
    useStore(
      useShallow((state) => ({
        paceSettings: state.app?.paceSettings ?? {
          basePaceSPerKm: 490,
          kFatigue: 0.004,
        },
        setPaceSettings: state.setPaceSettings ?? (() => {}),
        reprocessGPXFile: state.reprocessGPXFile ?? (() => {}),
        // Follower mode: connected to a runner's session (not broadcasting)
        isFollower: state.gps?.followerConnectionStatus === "connected",
      })),
    );

  const { basePaceSPerKm, kFatigue } = paceSettings;

  const handlePaceChange = useCallback(
    (e) => {
      const value = Number(e.target.value);
      setPaceSettings({ basePaceSPerKm: value });
      reprocessGPXFile();
    },
    [setPaceSettings, reprocessGPXFile],
  );

  const handleFatigueChange = useCallback(
    (e) => {
      const value = Number(e.target.value);
      setPaceSettings({ kFatigue: value });
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
            <span className="setting-value">{formatPace(basePaceSPerKm)}</span>
          </div>
          <input
            type="range"
            className="slider"
            min={300}
            max={900}
            step={5}
            value={basePaceSPerKm}
            onChange={handlePaceChange}
            disabled={isFollower}
            aria-label="Base flat-terrain pace"
            aria-readonly={isFollower}
          />
          <div className="slider-bounds">
            <span>5:00</span>
            <span>15:00</span>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-label-row">
            <span className="setting-name">Fatigue</span>
            <span className="setting-value">{fatigueName(kFatigue)}</span>
          </div>
          <input
            type="range"
            className="slider"
            min={0.001}
            max={0.02}
            step={0.001}
            value={kFatigue}
            onChange={handleFatigueChange}
            disabled={isFollower}
            aria-label="Cumulative fatigue coefficient"
            aria-readonly={isFollower}
          />
          <div className="slider-bounds">
            <span>Low</span>
            <span>High</span>
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
