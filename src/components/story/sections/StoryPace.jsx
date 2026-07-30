import { memo, useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore, { DEFAULT_PACE_SETTINGS } from "../../../store/store.js";
import PaceProfile from "../../trailData/PaceProfile/PaceProfile.jsx";
import {
  closestOption,
  LIFE_BASE_STOP_OPTIONS,
  RUNNER_PROFILES,
} from "../../trailData/PaceSettings/PaceSettings.constants.js";
import StorySection from "../StorySection.jsx";

import style from "./StoryPace.style.js";

function closestProfile(basePaceSPerKm) {
  return RUNNER_PROFILES.reduce((best, p) =>
    Math.abs(p.basePaceSPerKm - basePaceSPerKm) <
    Math.abs(best.basePaceSPerKm - basePaceSPerKm)
      ? p
      : best,
  );
}

const StoryPace = memo(function StoryPace({ className }) {
  const {
    paceSettings,
    setPaceSettings,
    reprocessGPXFile,
    broadcastPaceSettings,
    isFollower,
  } = useStore(
    useShallow((state) => ({
      paceSettings: state.app?.paceSettings ?? DEFAULT_PACE_SETTINGS,
      setPaceSettings: state.setPaceSettings ?? (() => {}),
      reprocessGPXFile: state.reprocessGPXFile ?? (() => {}),
      broadcastPaceSettings: state.broadcastPaceSettings ?? (() => {}),
      isFollower: state.gps?.followerConnectionStatus === "connected",
    })),
  );

  const selectedProfile = closestProfile(paceSettings.basePaceSPerKm);
  const selectedStop = closestOption(
    LIFE_BASE_STOP_OPTIONS,
    paceSettings.lifeBaseStopS ?? 3600,
  );

  const handleProfileChange = useCallback(
    (profile) => {
      setPaceSettings({
        basePaceSPerKm: profile.basePaceSPerKm,
        kFatigue: profile.kFatigue,
      });
      reprocessGPXFile();
      broadcastPaceSettings();
    },
    [setPaceSettings, reprocessGPXFile, broadcastPaceSettings],
  );

  // why: LifeBase stop time (rest planned at major aid stations) was only
  // exposed via the old nav-app's PaceSettings panel — dropped here when the
  // profile picker was ported over. It feeds the same reprocessGPXFile pass
  // as the runner profile and materially changes total time estimates (the
  // hero's "est. time"), so it belongs alongside the profile picker.
  const handleStopChange = useCallback(
    (value) => {
      setPaceSettings({ lifeBaseStopS: value });
      reprocessGPXFile();
      broadcastPaceSettings();
    },
    [setPaceSettings, reprocessGPXFile, broadcastPaceSettings],
  );

  return (
    <div className={className}>
      <StorySection eyebrow="The pace" title="Pace">
        <p className="lede">
          {isFollower
            ? "Required pace and effort across the route, for a runner like them."
            : "Required pace and effort across the route, for a runner like you."}
        </p>
        <div className="chart-frame">
          <PaceProfile />
        </div>

        <span className="picker-label">Runner profile</span>
        <div
          className="profile-picker"
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
                  ? "profile-btn active"
                  : "profile-btn"
              }
              onClick={() => handleProfileChange(profile)}
              disabled={isFollower}
            >
              {profile.label}
            </button>
          ))}
        </div>

        <span className="picker-label">Life base stops</span>
        <div
          className="profile-picker"
          role="radiogroup"
          aria-label="Planned stop duration at each life base"
        >
          {LIFE_BASE_STOP_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="radio"
              aria-checked={opt.value === selectedStop.value}
              className={
                opt.value === selectedStop.value
                  ? "profile-btn active"
                  : "profile-btn"
              }
              onClick={() => handleStopChange(opt.value)}
              disabled={isFollower}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="synced-note">{selectedStop.sub}</p>

        {isFollower && (
          <p className="synced-note">
            Synced from the runner you&apos;re following.
          </p>
        )}
      </StorySection>
    </div>
  );
});

const StyledStoryPace = style(StoryPace);

export default StyledStoryPace;
