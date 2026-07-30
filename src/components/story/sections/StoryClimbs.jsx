import { memo } from "react";

import { getClimbCategory } from "../../../helpers/climbCategory.js";
import { useCollapsibleList } from "../../../hooks/useCollapsibleList.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";
import CollapseToggle from "../CollapseToggle.jsx";
import StorySection from "../StorySection.jsx";

import style from "./StoryClimbs.style.js";

const StoryClimbs = memo(function StoryClimbs({ className }) {
  const climbs = useStore((state) => state.gpx.climbs);
  const projectedLocation = useProjectedLocation();
  const currentIdx = projectedLocation?.index ?? 0;

  // Collapse to a short preview by default — but never behind the climb
  // that's current or next, so a long route's climb list doesn't bury the
  // one a runner mid-race actually cares about.
  const activeClimbIndex = (climbs ?? []).findIndex(
    (climb) => currentIdx < climb.endIndex,
  );
  const { visibleCount, hiddenCount, expand } = useCollapsibleList(
    climbs?.length ?? 0,
    { threshold: 5, activeIndex: activeClimbIndex },
  );

  if (!climbs?.length) {
    return (
      <div className={className}>
        <StorySection eyebrow="The climbs" title="Climbs">
          <p className="empty">No significant climbs on this route.</p>
        </StorySection>
      </div>
    );
  }

  const currentClimbIndex = climbs.findIndex(
    (climb) => currentIdx >= climb.startIndex && currentIdx < climb.endIndex,
  );
  // why: gain bars scale relative to the hardest climb on *this* route — a
  // 200m bump reads small next to a 1500m climb and huge on a flatter one.
  const maxGain = Math.max(1, ...climbs.map((climb) => climb.elevationGain));

  return (
    <div className={className}>
      <StorySection eyebrow="The climbs" title={`${climbs.length} climbs`}>
        <p className="climb-legend-note">
          Climbs are graded 4 (easiest) to 1, then HC — hors catégorie, harder
          still — by length and steepness.
        </p>
        <div className="climb-list">
          {climbs.slice(0, visibleCount).map((climb, i) => {
            const isPast = currentIdx >= climb.endIndex;
            const isCurrent = !isPast && i === currentClimbIndex;
            const category = getClimbCategory(climb);
            const gainPct = Math.round((climb.elevationGain / maxGain) * 100);
            const startKm = climb.startDistM / 1000;

            return (
              <div
                key={`${climb.startIndex}-${climb.endIndex}`}
                className={`climb-row${isPast ? " past" : ""}${
                  isCurrent ? " current" : ""
                }`}
              >
                <div className={`climb-marker${category ? "" : " unranked"}`}>
                  {category?.key}
                </div>
                <div className="climb-info">
                  <div className="climb-meta-row">
                    <span className="climb-at">
                      {isCurrent ? "In progress" : `${startKm.toFixed(1)} km`}
                    </span>
                    <span className="climb-summit">
                      {Math.round(climb.summitElev)} m summit
                    </span>
                  </div>
                  <div className="climb-gain-bar">
                    <div
                      className="climb-gain-bar-fill"
                      style={{ width: `${gainPct}%` }}
                    />
                  </div>
                  <div className="climb-stats-row">
                    <span>+{Math.round(climb.elevationGain)} m</span>
                    <span className="sep">·</span>
                    <span>{Math.round(climb.avgGradient * 10) / 10}%</span>
                    <span className="sep">·</span>
                    <span>{(climb.climbDistM / 1000).toFixed(1)} km</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <CollapseToggle hiddenCount={hiddenCount} onExpand={expand} />
      </StorySection>
    </div>
  );
});

const StyledStoryClimbs = style(StoryClimbs);

export default StyledStoryClimbs;
