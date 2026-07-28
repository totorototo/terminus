import { memo } from "react";

import { format } from "date-fns";

import { useStageETAs } from "../../../hooks/useStageETAs.js";
import StorySection from "../StorySection.jsx";

import style from "./StoryStages.style.js";

const StoryStages = memo(function StoryStages({ className }) {
  const { stageETAs } = useStageETAs();

  if (!stageETAs?.length) return null;

  return (
    <div className={className}>
      <StorySection eyebrow="The stages" title="Milestones">
        <p className="lede">Start, life bases, and the finish.</p>
        <ol className="stage-list">
          {stageETAs.map((stage) => (
            <li
              key={stage.stageId}
              className={`stage-row${stage.isPast ? " past" : ""}${
                stage.isCurrent ? " current" : ""
              }`}
            >
              <div className="stage-main">
                <span className="stage-name">
                  {stage.endLocation || "Stage"}
                </span>
                <span className="stage-km">{stage.endKm.toFixed(1)} km</span>
              </div>
              <div className="stage-eta">
                <span>
                  {stage.isPast
                    ? "Reached"
                    : stage.etaMs
                      ? format(new Date(stage.etaMs), "EEE HH:mm")
                      : "--:--"}
                </span>
                {stage.cutoffMs != null && (
                  <span
                    className={`stage-cutoff${stage.isOverCutoff ? " over" : ""}`}
                  >
                    cutoff {format(new Date(stage.cutoffMs), "EEE HH:mm")}
                    {stage.isOverCutoff ? " · over" : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </StorySection>
    </div>
  );
});

const StyledStoryStages = style(StoryStages);

export default StyledStoryStages;
