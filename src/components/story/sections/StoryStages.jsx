import { memo, useState } from "react";

import { useTheme } from "styled-components";

import { DIFFICULTY_LABELS } from "../../../constants.js";
import {
  formatRaceTime,
  raceClockNote,
  raceUtcOffset,
} from "../../../helpers/raceClock.js";
import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import { useCollapsibleList } from "../../../hooks/useCollapsibleList.js";
import { useStageETAs } from "../../../hooks/useStageETAs.js";
import useStore from "../../../store/store.js";
import {
  CUTOFF_BADGE_LABELS,
  cutoffTier as toCutoffTier,
  formatDuration,
  formatMargin,
} from "../../trailData/etaLegHelpers.js";
import CollapseToggle from "../CollapseToggle.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryStages.style.js";

const StoryStages = memo(function StoryStages({ className }) {
  const theme = useTheme();
  const { stageETAs } = useStageETAs();
  const { checkpointETAs } = useCheckpointETAs();
  const stages = useStore((state) => state.stages);
  const utcOffset = useStore((state) => raceUtcOffset(state.waypoints));
  const clockNote = raceClockNote(utcOffset);

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

  // why: on trail, only the stage you're mid-leg on needs its full breakdown
  // open by default — everything else stays a one-line glance until tapped,
  // so the list doesn't force a wall of dense stats in front of you at once.
  // Stored as a toggle-from-default set (XOR'd against isCurrent below)
  // rather than an expanded-ids set, so the open row tracks the race's
  // current stage live without an effect re-syncing state on every tick.
  const [toggledIds, setToggledIds] = useState(() => new Set());

  if (!stageETAs?.length) return null;

  const toggleExpanded = (stageId) => {
    setToggledIds((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  return (
    <div className={className}>
      <StorySection eyebrow="The stages" title="Milestones">
        <p className="lede">
          Start, life bases, and the finish.{clockNote && ` ${clockNote}`}
        </p>
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
            const cutoffMarginMs =
              isFinish && finishCheckpointETA
                ? finishCheckpointETA.cutoffMarginMs
                : stage.cutoffMarginMs;
            const raw = stages?.[i];
            const difficultyLabel =
              stage.difficulty > 0
                ? DIFFICULTY_LABELS[stage.difficulty - 1]
                : null;
            const difficultyColor =
              stage.difficulty > 0
                ? theme.colors[theme.currentVariant][
                    `--color-effort-${stage.difficulty}`
                  ]
                : null;

            // why: on trail you need a status you can read at a glance, not a
            // percentage to do math on — a bold word carries in direct sun
            // and while moving where a thin bar or "73% used" doesn't.
            // why: once reached, the row's ETA is a reconstruction, not the
            // real arrival — a badge or margin from it would be invented.
            const cutoffTier =
              cutoffMs == null || stage.isPast
                ? null
                : isOverCutoff
                  ? "over"
                  : toCutoffTier(cutoffMarginMs);
            const cutoffBadge = cutoffTier
              ? CUTOFF_BADGE_LABELS[cutoffTier]
              : null;

            const isExpanded =
              stage.isCurrent !== toggledIds.has(stage.stageId);
            const detailsId = `stage-details-${stage.stageId}`;

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
                    <span className="stage-eta-time">
                      {stage.isPast
                        ? "Reached"
                        : etaMs
                          ? formatRaceTime(etaMs, utcOffset)
                          : "--:--"}
                    </span>
                    {cutoffBadge && (
                      <span className={`stage-badge tier-${cutoffTier}`}>
                        {cutoffBadge}
                      </span>
                    )}
                  </div>
                </div>
                {cutoffMs != null && (
                  <dl className="stage-figures">
                    <div>
                      <dt>Cutoff</dt>
                      <dd>{formatRaceTime(cutoffMs, utcOffset)}</dd>
                    </div>
                    <div>
                      <dt>Margin</dt>
                      <dd className={cutoffTier === "over" ? "is-over" : ""}>
                        {stage.isPast ? "--" : formatMargin(cutoffMarginMs)}
                      </dd>
                    </div>
                  </dl>
                )}
                {raw && (
                  <>
                    <button
                      type="button"
                      className="stage-details-toggle"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => toggleExpanded(stage.stageId)}
                    >
                      {isExpanded ? "Hide details" : "Details"}
                    </button>
                    <div
                      className={`stage-details${isExpanded ? " open" : ""}`}
                      id={detailsId}
                      inert={!isExpanded}
                    >
                      <div className="stage-details-inner">
                        <div className="stage-stats-grid">
                          <div className="stat-cell">
                            <span className="stat-label">Gain / Loss</span>
                            <span className="stat-value stacked-value">
                              <span>
                                +{Math.round(raw.totalElevation || 0)} m
                              </span>
                              <span>
                                −{Math.round(raw.totalElevationLoss || 0)} m
                              </span>
                            </span>
                          </div>
                          <div className="stat-cell">
                            <span className="stat-label">Time</span>
                            <span className="stat-value stacked-value">
                              <span>
                                {formatDuration(raw.estimatedDuration)}
                              </span>
                              <span className="stat-sub">
                                max {formatDuration(raw.maxCompletionTime)}
                              </span>
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
                      </div>
                    </div>
                  </>
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
