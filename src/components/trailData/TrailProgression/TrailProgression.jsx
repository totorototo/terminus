import { memo, useMemo } from "react";
import { useProjectedLocation } from "../../../store/store.js";
import useStore from "../../../store/store.js";
import style from "./TrailProgression.style.js";

const TrailProgression = memo(function TrailProgression({ className }) {
  const projectedLocation = useProjectedLocation();
  const currentPositionIndex = projectedLocation?.index || 0;

  const cumulativeDistances = useStore(
    (state) => state.gpx.cumulativeDistances || [],
  );
  const cumulativeElevations = useStore(
    (state) => state.gpx.cumulativeElevations || [],
  );
  const cumulativeElevationLosses = useStore(
    (state) => state.gpx.cumulativeElevationLosses || [],
  );

  const stats = useMemo(() => {
    const distanceDone = cumulativeDistances[currentPositionIndex] || 0;
    const totalDistance =
      cumulativeDistances[cumulativeDistances.length - 1] || 0;
    const elevationGain = cumulativeElevations[currentPositionIndex] || 0;
    const elevationLoss = cumulativeElevationLosses[currentPositionIndex] || 0;

    return {
      distanceDone,
      totalDistance,
      elevationGain,
      elevationLoss,
    };
  }, [
    currentPositionIndex,
    cumulativeDistances,
    cumulativeElevations,
    cumulativeElevationLosses,
  ]);

  const distancePercent =
    stats.totalDistance > 0
      ? (stats.distanceDone / stats.totalDistance) * 100
      : 0;

  return (
    <div className={className}>
      <div className="progression-header">
        <span className="progression-label">Distance</span>
        <span className="progression-value">{distancePercent.toFixed(0)}%</span>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${distancePercent}%` }}
        />
      </div>

      <div className="elevation-container">
        <div className="elevation-item">
          <span className="elevation-label">Elevation Gain</span>
          <span className="elevation-value">
            {stats.elevationGain.toFixed(0)} m
          </span>
        </div>
        <div className="elevation-divider" />
        <div className="elevation-item">
          <span className="elevation-label">Elevation Loss</span>
          <span className="elevation-value">
            {stats.elevationLoss.toFixed(0)} m
          </span>
        </div>
      </div>
    </div>
  );
});

export default style(TrailProgression);
