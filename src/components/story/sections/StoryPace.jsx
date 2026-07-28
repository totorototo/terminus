import { memo, useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore from "../../../store/store.js";
import PaceProfile from "../../trailData/PaceProfile/PaceProfile.jsx";
import { RUNNER_PROFILES } from "../../trailData/PaceSettings/PaceSettings.constants.js";
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
  const { paceSettings, setPaceSettings, reprocessGPXFile, isFollower } =
    useStore(
      useShallow((state) => ({
        paceSettings: state.app?.paceSettings ?? {
          basePaceSPerKm: 365,
          kFatigue: 0.003,
        },
        setPaceSettings: state.setPaceSettings ?? (() => {}),
        reprocessGPXFile: state.reprocessGPXFile ?? (() => {}),
        isFollower: state.gps?.followerConnectionStatus === "connected",
      })),
    );

  const selectedProfile = closestProfile(paceSettings.basePaceSPerKm);

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

  return (
    <div className={className}>
      <StorySection eyebrow="The pace" title="Pace">
        <p className="lede">
          Required pace and effort across the route, for a runner like you.
        </p>
        <div className="chart-frame">
          <PaceProfile />
        </div>

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
