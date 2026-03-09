import { memo } from "react";

import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./PeakSummary.style.js";

const PeakSummary = memo(function PeakSummary({ className }) {
  const climbs = useStore((state) => state.gpx.climbs);
  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances,
  );
  const projectedLocation = useProjectedLocation();

  const currentIdx = projectedLocation?.index ?? 0;
  const currentDistM = cumulativeDistances?.[currentIdx] ?? 0;

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

  return (
    <div className={className}>
      <div className="list-header">
        <span className="header-label">Climbs</span>
        <span className="header-count">{climbs.length}</span>
      </div>
      <div className="climb-list">
        {climbs.map((climb, i) => {
          const isPast = currentIdx >= climb.endIndex;
          const isCurrent =
            !isPast &&
            currentIdx >= climb.startIndex &&
            currentIdx < climb.endIndex;
          const distToStartKm = (climb.startDistM - currentDistM) / 1000;

          return (
            <div
              key={i}
              className={`climb-row${isPast ? " past" : ""}${isCurrent ? " current" : ""}`}
            >
              <div className="climb-left">
                <div
                  className={`climb-dot${isPast ? " past" : isCurrent ? " current" : ""}`}
                />
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
                  <div className="climb-stats-row">
                    <span className="climb-stat">
                      {(climb.climbDistM / 1000).toFixed(1)} km
                    </span>
                    <span className="climb-sep">·</span>
                    <span className="climb-stat gain">
                      +{Math.round(climb.elevationGain)} m
                    </span>
                    <span className="climb-sep">·</span>
                    <span className="climb-stat gradient">
                      {Math.round(climb.avgGradient * 10) / 10}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default style(PeakSummary);
