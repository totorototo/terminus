import { useMemo } from "react";

import { projectPoints, VIEW } from "./offlineRouteProjection.js";

function OfflineRoutePreview({
  className,
  coordinates,
  runnerPosition,
  routeColor,
  runnerColor,
}) {
  const { points, runner } = useMemo(() => {
    const { toSvg } = projectPoints(coordinates);
    const pts = coordinates.map(toSvg);
    const r = runnerPosition
      ? toSvg([runnerPosition.longitude, runnerPosition.latitude])
      : null;
    return { points: pts, runner: r };
  }, [coordinates, runnerPosition]);

  return (
    <div className={className}>
      <svg
        className="offline-preview"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Route preview (map tiles unavailable offline)"
      >
        <polyline
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={routeColor}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {runner && (
          <circle
            cx={runner[0]}
            cy={runner[1]}
            r={6}
            fill={runnerColor}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="offline-badge">Offline — map tiles unavailable</div>
    </div>
  );
}

export default OfflineRoutePreview;
