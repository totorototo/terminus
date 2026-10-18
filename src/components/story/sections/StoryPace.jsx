import { memo, useCallback, useRef, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import useStore, { DEFAULT_PACE_SETTINGS } from "../../../store/store.js";
import PaceProfile from "../../trailData/PaceProfile/PaceProfile.jsx";
import {
  closestOption,
  LIFE_BASE_STOP_OPTIONS,
  modelText,
  planFileError,
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

// The plan.json the pace came from, in place of the pickers: its model, and a
// way back to the pickers.
function PlanFileModel({ planFile, paceSettings, onRemove }) {
  return (
    <>
      <span className="picker-label">Plan</span>
      <p className="plan-model" data-testid="plan-model">
        {modelText(paceSettings)}
      </p>
      <p className="synced-note">
        From {planFile.name}.{" "}
        <button type="button" className="text-btn" onClick={onRemove}>
          Use the pickers instead
        </button>
      </p>
    </>
  );
}

const StoryPace = memo(function StoryPace({ className }) {
  const planInputRef = useRef(null);
  const [planError, setPlanError] = useState(null);
  const {
    paceSettings,
    setPaceSettings,
    reprocessGPXFile,
    broadcastPaceSettings,
    isFollower,
    planFile,
    setPlanFile,
    readPlanFile,
  } = useStore(
    useShallow((state) => ({
      paceSettings: state.app?.paceSettings ?? DEFAULT_PACE_SETTINGS,
      setPaceSettings: state.setPaceSettings ?? (() => {}),
      reprocessGPXFile: state.reprocessGPXFile ?? (() => {}),
      broadcastPaceSettings: state.broadcastPaceSettings ?? (() => {}),
      isFollower: state.gps?.followerConnectionStatus === "connected",
      planFile: state.app?.planFile ?? null,
      setPlanFile: state.setPlanFile ?? (() => {}),
      readPlanFile: state.readPlanFile,
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

  // A plan.json from Regimen: gpxz checks it was made for this route, and its
  // model replaces the pickers'. The live weather and recalibration still run
  // on top of it, as they do on the pickers' settings.
  const handlePlanFile = useCallback(
    async (file) => {
      setPlanError(null);
      try {
        const settings = await readPlanFile(await file.arrayBuffer());
        setPaceSettings(settings);
        setPlanFile({ name: file.name });
        reprocessGPXFile();
        broadcastPaceSettings();
      } catch (error) {
        setPlanError(planFileError(error.message));
      }
    },
    [
      readPlanFile,
      setPaceSettings,
      setPlanFile,
      reprocessGPXFile,
      broadcastPaceSettings,
    ],
  );

  const showPlanFile = planFile && !isFollower;

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

        {showPlanFile ? (
          <PlanFileModel
            planFile={planFile}
            paceSettings={paceSettings}
            onRemove={() => setPlanFile(null)}
          />
        ) : (
          <>
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
          </>
        )}

        {!isFollower && !showPlanFile && readPlanFile && (
          <>
            <button
              type="button"
              className="text-btn plan-open"
              onClick={() => planInputRef.current?.click()}
            >
              Use a plan.json from Regimen
            </button>
            <input
              ref={planInputRef}
              type="file"
              accept=".json"
              hidden
              data-testid="plan-input"
              onChange={(event) => {
                const [file] = event.target.files;
                if (file) handlePlanFile(file);
                event.target.value = "";
              }}
            />
          </>
        )}
        {planError && (
          <p className="plan-error" role="alert">
            {planError}
          </p>
        )}

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
