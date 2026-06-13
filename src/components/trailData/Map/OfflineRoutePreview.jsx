import { useMemo } from "react";

// SVG dimensions are arbitrary — the viewBox scales to fit the container via
// preserveAspectRatio. Strokes use non-scaling-stroke so they stay crisp.
export const VIEW = 1000;
const PADDING = 40;

// Project [lng, lat] points into SVG space when no basemap is available
// offline. Longitude is scaled by cos(latitude) so the route keeps a sane
// aspect ratio instead of stretching horizontally, and the Y axis is flipped
// because SVG grows downward while latitude grows upward.
export function projectPoints(coordinates) {
  // Routes can hold tens of thousands of points, so walk them with loops
  // rather than spreading into Math.min/max (which overflows the call stack on
  // large arrays) or allocating intermediate arrays.
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [, lat] of coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180) || 1;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [lng, lat] of coordinates) {
    const x = lng * kx;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = (VIEW - PADDING * 2) / Math.max(spanX, spanY);
  // Centre the route within the square viewBox.
  const offsetX = (VIEW - spanX * scale) / 2;
  const offsetY = (VIEW - spanY * scale) / 2;

  const toSvg = ([lng, lat]) => {
    const x = (lng * kx - minX) * scale + offsetX;
    const y = VIEW - ((lat - minY) * scale + offsetY);
    return [x, y];
  };

  return { toSvg };
}

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
