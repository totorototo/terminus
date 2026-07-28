import { memo } from "react";

import { format } from "date-fns";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useStageETAs } from "../../../hooks/useStageETAs.js";
import useStore from "../../../store/store.js";
import { formatDuration } from "../../trailData/etaLegHelpers.js";
import StorySection from "../StorySection.jsx";

import style from "./StoryStages.style.js";

const StoryStages = memo(function StoryStages({ className }) {
  const { stageETAs } = useStageETAs();
  const stages = useStore((state) => state.stages);

  if (!stageETAs?.length) return null;

  return (
    <div className={className}>
      <StorySection eyebrow="The stages" title="Milestones">
        <p className="lede">Start, life bases, and the finish.</p>
        <ol className="stage-list">
          {stageETAs.map((stage, i) => {
            const raw = stages?.[i];
            const difficultyLabel =
              stage.difficulty > 0
                ? DIFFICULTY_LABELS[stage.difficulty - 1]
                : null;
            const difficultyColor =
              stage.difficulty > 0
                ? DIFFICULTY_COLORS[stage.difficulty - 1]
                : null;

            return (
              <li
                key={stage.stageId}
                className={`stage-row${stage.isPast ? " past" : ""}${
                  stage.isCurrent ? " current" : ""
                }`}
              >
                <div className="stage-top">
                  <div className="stage-main">
                    <span className="stage-name">
                      {stage.endLocation || "Stage"}
                    </span>
                    <span className="stage-km">
                      {stage.endKm.toFixed(1)} km
                    </span>
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
                </div>
                {raw && (
                  <div className="stage-stats-grid">
                    <div className="stat-cell">
                      <span className="stat-label">Distance</span>
                      <span className="stat-value">
                        {((raw.totalDistance || 0) / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Gain / Loss</span>
                      <span className="stat-value">
                        {`+${Math.round(raw.totalElevation || 0)} m −${Math.round(raw.totalElevationLoss || 0)} m`}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Time</span>
                      <span className="stat-value">
                        {formatDuration(raw.estimatedDuration)}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Max time</span>
                      <span className="stat-value">
                        {formatDuration(raw.maxCompletionTime)}
                      </span>
                    </div>
                    <div className="stat-cell wide">
                      <span className="stat-label">Difficulty</span>
                      <span className="stat-value difficulty-value">
                        {difficultyColor && (
                          <span
                            className="difficulty-dot"
                            style={{ background: difficultyColor }}
                          />
                        )}
                        {difficultyLabel || "--"}
                      </span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </StorySection>
    </div>
  );
});

const StyledStoryStages = style(StoryStages);

export default StyledStoryStages;
