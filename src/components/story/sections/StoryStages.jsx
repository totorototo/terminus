import { memo } from "react";

import { format } from "date-fns";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import { useCollapsibleList } from "../../../hooks/useCollapsibleList.js";
import { useStageETAs } from "../../../hooks/useStageETAs.js";
import useStore from "../../../store/store.js";
import { formatDuration } from "../../trailData/etaLegHelpers.js";
import CollapseToggle from "../CollapseToggle.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryStages.style.js";

const StoryStages = memo(function StoryStages({ className }) {
  const { stageETAs } = useStageETAs();
  const { checkpointETAs } = useCheckpointETAs();
  const stages = useStore((state) => state.stages);

  // why: TimeBarriers only exist as SECTION boundaries — a stage spanning
  // several of them is blind to any cutoff missed mid-stage and would show
  // an optimistic finish ignoring it. Arrival is the same physical boundary
  // in both partitions, so the finish row always defers to the cutoff-aware
  // section computation StoryHero/StoryCheckpoints already use, instead of
  // this stage-level list's own (less complete) cutoff tracking.
  const finishCheckpointETA = checkpointETAs?.length
    ? checkpointETAs[checkpointETAs.length - 1]
    : null;

  // Collapse to a short preview by default — but never behind the stage
  // that's current or next, so a long route's milestone list doesn't bury
  // the one a runner mid-race actually cares about.
  const activeStageIndex = stageETAs?.findIndex((stage) => !stage.isPast) ?? -1;
  const { visibleCount, hiddenCount, expand } = useCollapsibleList(
    stageETAs?.length ?? 0,
    { threshold: 5, activeIndex: activeStageIndex },
  );

  if (!stageETAs?.length) return null;

  return (
    <div className={className}>
      <StorySection eyebrow="The stages" title="Milestones">
        <p className="lede">Start, life bases, and the finish.</p>
        <ol className="stage-list">
          {stageETAs.slice(0, visibleCount).map((stage, i) => {
            const isFinish = i === stageETAs.length - 1;
            const etaMs =
              isFinish && finishCheckpointETA
                ? finishCheckpointETA.etaMs
                : stage.etaMs;
            const cutoffMs =
              isFinish && finishCheckpointETA
                ? finishCheckpointETA.cutoffMs
                : stage.cutoffMs;
            const isOverCutoff =
              isFinish && finishCheckpointETA
                ? finishCheckpointETA.isOverCutoff
                : stage.isOverCutoff;
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
                        : etaMs
                          ? format(new Date(etaMs), "EEE HH:mm")
                          : "--:--"}
                    </span>
                    {cutoffMs != null && (
                      <span
                        className={`stage-cutoff${isOverCutoff ? " over" : ""}`}
                      >
                        cutoff {format(new Date(cutoffMs), "EEE HH:mm")}
                        {isOverCutoff ? " · over" : ""}
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
        <CollapseToggle hiddenCount={hiddenCount} onExpand={expand} />
      </StorySection>
    </div>
  );
});

const StyledStoryStages = style(StoryStages);

export default StyledStoryStages;
