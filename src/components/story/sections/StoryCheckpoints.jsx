import { memo } from "react";

import { format } from "date-fns";

import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "../../../constants.js";
import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import useStore from "../../../store/store.js";
import { formatDuration } from "../../trailData/etaLegHelpers.js";
import StorySection from "../StorySection.jsx";

import style from "./StoryCheckpoints.style.js";

function formatRemaining(etaMs) {
  if (etaMs == null) return null;
  const remainingMs = etaMs - Date.now();
  if (remainingMs <= 0) return null;
  const totalMinutes = Math.floor(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const StoryCheckpoints = memo(function StoryCheckpoints({ className }) {
  const { checkpointETAs } = useCheckpointETAs();
  const sections = useStore((state) => state.sections);

  if (!checkpointETAs?.length) {
    return (
      <div className={className}>
        <StorySection eyebrow="The checkpoints" title="Checkpoints">
          <p className="empty">No checkpoints on this route.</p>
        </StorySection>
      </div>
    );
  }

  return (
    <div className={className}>
      <StorySection eyebrow="The checkpoints" title="Checkpoints">
        <ol className="checkpoint-list">
          {checkpointETAs.map((cp, i) => {
            const remaining = formatRemaining(cp.etaMs);
            const section = sections?.[i];
            const difficultyLabel =
              cp.difficulty > 0 ? DIFFICULTY_LABELS[cp.difficulty - 1] : null;
            const difficultyColor =
              cp.difficulty > 0 ? DIFFICULTY_COLORS[cp.difficulty - 1] : null;

            return (
              <li
                key={cp.sectionId}
                className={`checkpoint-row${cp.isPast ? " past" : ""}${
                  cp.isCurrent ? " current" : ""
                }`}
              >
                <div className="checkpoint-top">
                  <div className="checkpoint-main">
                    <span className="checkpoint-name">
                      {cp.endLocation || "Checkpoint"}
                    </span>
                    <span className="checkpoint-km">
                      {cp.endKm.toFixed(1)} km
                    </span>
                  </div>
                  <div className="checkpoint-eta">
                    {cp.isPast ? (
                      <span className="checkpoint-reached">Reached</span>
                    ) : (
                      <>
                        <span>
                          {cp.etaMs
                            ? format(new Date(cp.etaMs), "EEE HH:mm")
                            : "--:--"}
                        </span>
                        {remaining && <span className="sep">·</span>}
                        {remaining && <span>in {remaining}</span>}
                      </>
                    )}
                    {cp.cutoffMs != null && (
                      <span
                        className={`checkpoint-cutoff${cp.isOverCutoff ? " over" : ""}`}
                      >
                        cutoff {format(new Date(cp.cutoffMs), "EEE HH:mm")}
                        {cp.isOverCutoff ? " · over" : ""}
                      </span>
                    )}
                  </div>
                </div>
                {section && (
                  <div className="checkpoint-stats-grid">
                    <div className="stat-cell">
                      <span className="stat-label">Distance</span>
                      <span className="stat-value">
                        {((section.totalDistance || 0) / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Gain / Loss</span>
                      <span className="stat-value">
                        {`+${Math.round(section.totalElevation || 0)} m −${Math.round(section.totalElevationLoss || 0)} m`}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Time</span>
                      <span className="stat-value">
                        {formatDuration(section.estimatedDuration)}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-label">Max time</span>
                      <span className="stat-value">
                        {formatDuration(section.maxCompletionTime)}
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

const StyledStoryCheckpoints = style(StoryCheckpoints);

export default StyledStoryCheckpoints;
