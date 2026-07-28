import { memo } from "react";

import { format } from "date-fns";

import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
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
          {checkpointETAs.map((cp) => {
            const remaining = formatRemaining(cp.etaMs);

            return (
              <li
                key={cp.sectionId}
                className={`checkpoint-row${cp.isPast ? " past" : ""}${
                  cp.isCurrent ? " current" : ""
                }`}
              >
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
