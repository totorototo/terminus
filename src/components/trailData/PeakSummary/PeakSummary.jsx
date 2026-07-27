import { memo } from "react";

import { rgba } from "polished";
import { useTheme } from "styled-components";
import { useShallow } from "zustand/react/shallow";

import { getClimbCategory } from "../../../helpers/climbCategory.js";
import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./PeakSummary.style.js";

const PeakSummary = memo(function PeakSummary({ className }) {
  const { climbs, cumulativeDistances, setHighlightedClimb } = useStore(
    useShallow((state) => ({
      climbs: state.gpx.climbs,
      cumulativeDistances: state.gpx.cumulativeDistances,
      setHighlightedClimb: state.setHighlightedClimb,
    })),
  );
  const projectedLocation = useProjectedLocation();
  const theme = useTheme();
  const colors = theme.colors[theme.currentVariant];

  const currentIdx = projectedLocation?.index ?? 0;
  const currentDistM = cumulativeDistances?.[currentIdx] ?? 0;

  // At most one climb can be "in progress" at a time — the first one whose
  // range contains currentIdx and whose summit hasn't been reached yet.
  const currentClimbIndex =
    climbs?.findIndex(
      (climb) => currentIdx >= climb.startIndex && currentIdx < climb.endIndex,
    ) ?? -1;

  if (!climbs?.length) {
    return (
      <div className={className}>
        <div className="list-header">
          <span className="header-label">Climbs</span>
        </div>
        <div className="empty-state">No climbs detected</div>
      </div>
    );
  }

  // why: gain bars are scaled relative to the hardest climb in *this* route,
  // not an absolute meters scale — a 200m bump reads as small on a route with
  // a 1500m climb, and as huge on a route where 200m is the biggest thing.
  const maxGain = Math.max(1, ...climbs.map((climb) => climb.elevationGain));

  return (
    <div className={className}>
      <div className="list-header">
        <span className="header-label">Climbs</span>
        <span className="header-count">{climbs.length}</span>
      </div>
      <div className="climb-list" tabIndex={0} role="list" aria-label="Climbs">
        {climbs.map((climb, i) => {
          const isPast = currentIdx >= climb.endIndex;
          const isCurrent = !isPast && i === currentClimbIndex;
          const distToStartKm = (climb.startDistM - currentDistM) / 1000;
          const category = getClimbCategory(climb);
          const badgeColor = category ? colors["--color-primary"] : null;
          const badgeBackground = category
            ? rgba(colors["--color-primary"], 0.16)
            : null;

          const barColor = badgeColor ?? colors["--color-text"];
          const gainPct = Math.round((climb.elevationGain / maxGain) * 100);

          return (
            <div
              key={`${climb.startIndex}-${climb.endIndex}`}
              role="listitem"
              className={`climb-row${isPast ? " past" : ""}${isCurrent ? " current" : ""}`}
              onMouseEnter={() => setHighlightedClimb(i)}
              onMouseLeave={() => setHighlightedClimb(null)}
            >
              <div
                className={`climb-marker${isCurrent ? " current" : ""}`}
                style={
                  category
                    ? {
                        color: badgeColor,
                        borderColor: badgeColor,
                        backgroundColor: badgeBackground,
                      }
                    : undefined
                }
                title={
                  category
                    ? `Climb score ${Math.round(category.score)}`
                    : undefined
                }
              >
                {category ? category.label : "–"}
              </div>
              <div className="climb-info">
                <div className="climb-meta-row">
                  <span className="climb-at">
                    {isCurrent
                      ? "In progress"
                      : isPast
                        ? `${(climb.startDistM / 1000).toFixed(1)} km`
                        : distToStartKm > 0
                          ? `in ${distToStartKm.toFixed(1)} km`
                          : `${(climb.startDistM / 1000).toFixed(1)} km`}
                  </span>
                  <span className="climb-summit">
                    {Math.round(climb.summitElev)} m
                  </span>
                </div>
                <div className="climb-gain-bar">
                  <div
                    className="climb-gain-bar-fill"
                    style={{ width: `${gainPct}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="climb-stats-row">
                  <span className="climb-stat">
                    +{Math.round(climb.elevationGain)} m
                  </span>
                  <span className="climb-sep">·</span>
                  <span className="climb-stat">
                    {Math.round(climb.avgGradient * 10) / 10}%
                  </span>
                  <span className="climb-sep">·</span>
                  <span className="climb-stat">
                    {(climb.climbDistM / 1000).toFixed(1)} km
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const StyledPeakSummary = style(PeakSummary);

export default StyledPeakSummary;
