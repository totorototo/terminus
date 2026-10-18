import { memo, useCallback, useRef, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import {
  checkPlanFile,
  modelText,
  planFileError,
} from "../../../lib/planFile.js";
import useStore, { DEFAULT_PACE_SETTINGS } from "../../../store/store.js";
import PaceProfile from "../../trailData/PaceProfile/PaceProfile.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryPace.style.js";

// The pace comes from the race's plan.json (Regimen), opened with the GPX in
// the wizard: Terminus runs it, with the live weather and recalibration on
// top, and never picks one of its own. A follower sees the runner's, synced.
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

  // Another plan.json for the same race (remade in Regimen): gpxz checks it
  // names the route the worker holds, then the estimates are reprocessed and
  // the followers synced, as when the race was opened.
  const handlePlanFile = useCallback(
    async (file) => {
      const problem = checkPlanFile(file);
      if (problem) {
        setPlanError(problem);
        return;
      }
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

  let source;
  if (isFollower) source = "Synced from the runner you're following.";
  else if (planFile) source = `From ${planFile.name}.`;
  // A race opened before Terminus took plan.json files: its last model.
  else source = "No plan.json for this race yet.";

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

        <span className="picker-label">Plan</span>
        <p className="plan-model" data-testid="plan-model">
          {modelText(paceSettings)}
        </p>
        <p className="synced-note">
          {source}{" "}
          {!isFollower && readPlanFile && (
            <button
              type="button"
              className="text-btn"
              onClick={() => planInputRef.current?.click()}
            >
              {planFile ? "Replace plan.json" : "Open the plan.json"}
            </button>
          )}
        </p>
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
        {planError && (
          <p className="plan-error" role="alert">
            {planError}
          </p>
        )}
      </StorySection>
    </div>
  );
});

const StyledStoryPace = style(StoryPace);

export default StyledStoryPace;
