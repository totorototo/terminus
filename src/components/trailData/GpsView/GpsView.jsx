import { memo, useEffect, useMemo, useRef } from "react";

import { animated, to, useSpring } from "@react-spring/web";
import { useTheme } from "styled-components";

import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./GpsView.style.js";

// The SVG uses a square viewBox; the user marker sits in the lower portion so
// most of the screen shows the trail ahead, like a turn-by-turn GPS view.
const VIEW = 1000;
const USER_X = VIEW / 2;
const USER_Y = VIEW * 0.72;

// Zoom level: this much trail ahead fills the space above the user marker at
// the near (full-size) scale.
const FORWARD_METERS = 800;
const PIXELS_PER_METER = USER_Y / FORWARD_METERS;

// Tilted-perspective camera. Rather than tilting the rendered SVG with a CSS
// 3D transform (which stretches the raster and squashes the marker into an
// ellipse), every visible path point is run through a real ground-plane
// projection in vector space: the trail right at the user keeps its top-down
// scale and recedes toward a single vanishing row, the horizon.
//
// The projection is the exact 1-point perspective of a flat plane, written as a
// projective (Möbius) function of the forward distance f (metres ahead of the
// user):
//   s  = D0 / (f + D0)                       perspective scale: 1 near, →0 far
//   sx = USER_X + localX * s                 lateral position foreshortens
//   sy = USER_Y - (USER_Y - HORIZON_Y) * (1 - s)
// D0 is chosen (below) so that near the user the projection matches the
// top-down map exactly — only the far field bends away — making the tilt feel
// physical instead of a sheared image.
const HORIZON_Y = VIEW * 0.16;

// Distance constant of the perspective. Derived so that the vertical rate at
// the user (s ≈ 1) equals PIXELS_PER_METER, i.e. the first few metres ahead
// render at the same scale as the old flat view.
const PERSPECTIVE_DISTANCE = (USER_Y - HORIZON_Y) / PIXELS_PER_METER;

// How far ahead (and a little behind) to actually draw. Drawn well past the
// point where the trail visibly converges so it keeps climbing toward the
// vanishing row instead of ending on a hard line; the distance fade (mask
// below) dissolves the far end, so the exact value only sets how much winding
// trail can stack up before the horizon.
const FAR_METERS = 5000;

// How much of the already-travelled trail to draw behind the user. It projects
// below the marker (magnified, running off the bottom) and is drawn as a muted
// line, so the route reads as done-behind / upcoming-ahead. Points that fall
// past the camera plane are dropped by the projection's denominator guard, so
// this only needs to be generous, not exact.
const BEHIND_METERS = 300;

// Guard against the perspective divide blowing up for points at or behind the
// camera plane (f ≈ -D0): drop a point when its denominator falls below this.
const MIN_DENOMINATOR_METERS = 8;

// "2.5D" elevation relief. Each point is lifted on screen by its height above
// the user's current elevation, in the same metric scale as the horizontal map
// (PIXELS_PER_METER) and foreshortened by the same perspective scale, so climbs
// ahead rear up and descents fall away. A real grade is tiny next to its
// horizontal run, so the lift is exaggerated to read in perspective — this is a
// deliberate vertical stretch, not a true-scale 3D camera.
const VERTICAL_EXAGGERATION = 1.2;

// The heading is the direction from the current position to a point this far
// ahead along the path. A single look-ahead chord rotates continuously through
// a turn, whereas averaging several forward direction vectors reverses abruptly
// at a hairpin apex (the opposing vectors cancel) and makes the scene spin.
const HEADING_CHORD_METERS = 20;

// On a hairpin the look-ahead point doubles back to nearly the current
// position, collapsing the chord; below this fraction of its straight-line
// length the heading is treated as undefined and the previous one is kept, so
// the rotation holds steady instead of swinging on noise.
const HEADING_MIN_CHORD_RATIO = 0.1;

// GPX tracks contain signal gaps (e.g. a ~120m straight chord where reception
// dropped) whose sharp artificial corners make the look-ahead heading — and so
// the scene rotation — wobble left and right. Resampling to a uniform step and
// applying a short moving average rounds those corners and cancels per-point
// jitter.
const RESAMPLE_STEP_METERS = 8;
const SMOOTH_RADIUS = 3;

const EARTH_RADIUS = 6371000;
const DEG_TO_RAD = Math.PI / 180;

// Stable empty reference so memo dependencies don't change before the path is
// built.
const EMPTY_ARRAY = [];

// Project a [lat, lon] point to local east/north meters relative to an origin
// using an equirectangular approximation (accurate enough over a few hundred
// metres).
function toLocalMeters([lat, lon], originLat, originLon, cosOriginLat) {
  const east = (lon - originLon) * DEG_TO_RAD * EARTH_RADIUS * cosOriginLat;
  const north = (lat - originLat) * DEG_TO_RAD * EARTH_RADIUS;
  return [east, north];
}

// Interpolate a world-pixel position along the path at a given distance, so the
// camera glides smoothly between trace points instead of snapping to indices.
function sampleAt(worldPoints, cumulativeDistances, targetMeters) {
  const count = worldPoints.length;
  if (count === 0) return [0, 0];
  const total = cumulativeDistances[count - 1] || 0;
  const clamped = Math.min(Math.max(targetMeters, 0), total);

  let low = 0;
  let high = count - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulativeDistances[mid] < clamped) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const index = low > 0 ? low - 1 : 0;
  const segmentStart = cumulativeDistances[index];
  const segmentEnd = cumulativeDistances[index + 1] ?? segmentStart;
  const span = segmentEnd - segmentStart || 1;
  const fraction = Math.min(Math.max((clamped - segmentStart) / span, 0), 1);

  const before = worldPoints[index];
  const after = worldPoints[index + 1] ?? before;
  return [
    before[0] + (after[0] - before[0]) * fraction,
    before[1] + (after[1] - before[1]) * fraction,
  ];
}

// Forward heading (degrees) that rotates the upcoming path to point up on
// screen, taken as the direction from the current position to a point one chord
// length ahead on the already-smoothed path. Returns null when that chord
// collapses (a hairpin right ahead, where the direction is ill-defined) so the
// caller can keep the previous heading.
function forwardHeading(worldPoints, cumulativeDistances, startMeters) {
  const here = sampleAt(worldPoints, cumulativeDistances, startMeters);
  const ahead = sampleAt(
    worldPoints,
    cumulativeDistances,
    startMeters + HEADING_CHORD_METERS,
  );
  const deltaX = ahead[0] - here[0];
  const deltaY = ahead[1] - here[1];
  const minLength =
    HEADING_CHORD_METERS * PIXELS_PER_METER * HEADING_MIN_CHORD_RATIO;
  if (Math.hypot(deltaX, deltaY) < minLength) return null;
  // atan2(-x, -y) maps the forward vector to the clockwise SVG rotation that
  // turns it toward screen-up (negative y).
  return (Math.atan2(-deltaX, -deltaY) * 180) / Math.PI;
}

// First index whose cumulative distance is >= target.
function lowerBound(cumulativeDistances, target) {
  let low = 0;
  let high = cumulativeDistances.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulativeDistances[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

// Interpolate a per-point scalar (elevation) at a given arc distance.
function sampleScalar(values, cumulativeDistances, target) {
  const count = values.length;
  if (count === 0) return 0;
  const total = cumulativeDistances[count - 1] || 0;
  const clamped = Math.min(Math.max(target, 0), total);
  const index = lowerBound(cumulativeDistances, clamped);
  if (index <= 0) return values[0];
  if (index >= count) return values[count - 1];
  const segmentStart = cumulativeDistances[index - 1];
  const segmentEnd = cumulativeDistances[index];
  const span = segmentEnd - segmentStart || 1;
  const fraction = Math.min(Math.max((clamped - segmentStart) / span, 0), 1);
  return values[index - 1] + (values[index] - values[index - 1]) * fraction;
}

// Project the trail slice between fromDistance and toDistance into an `M…L…`
// string. A new `M` breaks the sub-path wherever a point falls at/behind the
// camera plane, so the line never connects across the horizon.
function buildProjectedPath(
  worldPoints,
  elevations,
  cumulativeDistances,
  cameraDistance,
  heading,
  fromDistance,
  toDistance,
) {
  const camera = sampleAt(worldPoints, cumulativeDistances, cameraDistance);
  // Height reference: everything is lifted relative to the user's elevation, so
  // the trail meets the marker at the bottom regardless of absolute altitude.
  const cameraElevation = sampleScalar(
    elevations,
    cumulativeDistances,
    cameraDistance,
  );
  const radians = heading * DEG_TO_RAD;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const first = lowerBound(cumulativeDistances, fromDistance);
  const last = lowerBound(cumulativeDistances, toDistance);

  let data = "";
  let penDown = false;
  for (
    let index = first;
    index <= last && index < worldPoints.length;
    index += 1
  ) {
    const point = worldPoints[index];
    const deltaX = point[0] - camera[0];
    const deltaY = point[1] - camera[1];
    // Rotate into the camera frame (SVG rotate(heading) convention) so "ahead"
    // lands on screen-up, local Y negative.
    const localX = deltaX * cos - deltaY * sin;
    const localY = deltaX * sin + deltaY * cos;

    const forwardMeters = -localY / PIXELS_PER_METER;
    const denominator = forwardMeters + PERSPECTIVE_DISTANCE;
    if (denominator < MIN_DENOMINATOR_METERS) {
      penDown = false;
      continue;
    }
    const scale = PERSPECTIVE_DISTANCE / denominator;
    const screenX = USER_X + localX * scale;
    // Lift by height above the user, in the horizontal metric scale, exaggerated
    // and foreshortened by the same perspective scale so it recedes naturally.
    const lift =
      (elevations[index] - cameraElevation) *
      PIXELS_PER_METER *
      VERTICAL_EXAGGERATION *
      scale;
    const screenY = USER_Y - (USER_Y - HORIZON_Y) * (1 - scale) - lift;

    data += `${penDown ? "L" : "M"}${screenX.toFixed(1)} ${screenY.toFixed(1)}`;
    penDown = true;
  }
  return data;
}

// Build the static render geometry from the trace coordinates: project to local
// metres, resample at a uniform step, smooth, then convert to world pixels with
// their cumulative arc length. Resampling + smoothing rounds the sharp corners
// the Douglas-Peucker simplification leaves behind so the scene rotation no
// longer wobbles there.
function buildPath(coordinates) {
  const [baseLat, baseLon] = coordinates[0];
  const cosBaseLat = Math.cos(baseLat * DEG_TO_RAD) || 1;

  const rawMeters = coordinates.map((coordinate) =>
    toLocalMeters(coordinate, baseLat, baseLon, cosBaseLat),
  );
  // Per-point elevation (the trace's third component); defaults to 0 when a GPX
  // carries no altitude, which simply flattens the relief.
  const rawElevations = coordinates.map((coordinate) => coordinate[2] ?? 0);
  const rawCumulative = [0];
  for (let index = 1; index < rawMeters.length; index += 1) {
    const deltaEast = rawMeters[index][0] - rawMeters[index - 1][0];
    const deltaNorth = rawMeters[index][1] - rawMeters[index - 1][1];
    rawCumulative[index] =
      rawCumulative[index - 1] + Math.hypot(deltaEast, deltaNorth);
  }
  const total = rawCumulative[rawMeters.length - 1] || 0;

  // Uniform resampling turns a dataless gap chord into evenly spaced points.
  // Elevation is resampled along the same distances so it stays aligned.
  const resampled = [];
  const resampledElevations = [];
  for (let distance = 0; distance <= total; distance += RESAMPLE_STEP_METERS) {
    resampled.push(sampleAt(rawMeters, rawCumulative, distance));
    resampledElevations.push(
      sampleScalar(rawElevations, rawCumulative, distance),
    );
  }
  resampled.push(rawMeters[rawMeters.length - 1]);
  resampledElevations.push(rawElevations[rawElevations.length - 1]);

  // Short moving average rounds the artificial corners at gap ends, and damps
  // altitude noise so the relief doesn't jitter.
  const smoothed = resampled.map((point, index) => {
    let sumEast = 0;
    let sumNorth = 0;
    let sumElevation = 0;
    let count = 0;
    for (let offset = -SMOOTH_RADIUS; offset <= SMOOTH_RADIUS; offset += 1) {
      const neighbour = resampled[index + offset];
      if (neighbour) {
        sumEast += neighbour[0];
        sumNorth += neighbour[1];
        sumElevation += resampledElevations[index + offset];
        count += 1;
      }
    }
    return [sumEast / count, sumNorth / count, sumElevation / count];
  });

  const points = smoothed.map(([east, north]) => [
    east * PIXELS_PER_METER,
    -north * PIXELS_PER_METER,
  ]);
  const elevations = smoothed.map(([, , elevation]) => elevation);
  const cumulative = [0];
  for (let index = 1; index < smoothed.length; index += 1) {
    const deltaEast = smoothed[index][0] - smoothed[index - 1][0];
    const deltaNorth = smoothed[index][1] - smoothed[index - 1][1];
    cumulative[index] =
      cumulative[index - 1] + Math.hypot(deltaEast, deltaNorth);
  }

  return { points, elevations, cumulative, baseLat, baseLon, cosBaseLat };
}

const GpsView = memo(function GpsView({ className }) {
  const gpxData = useStore((state) => state.gpx.data);
  const projectedLocation = useProjectedLocation();
  const theme = useTheme();

  // Render path built from the store's processed trace: project to local metres,
  // resample to a uniform step and smooth so the scene rotation stays steady.
  const path = useMemo(
    () => (gpxData && gpxData.length >= 2 ? buildPath(gpxData) : null),
    [gpxData],
  );
  const cumulativeDistances = path ? path.cumulative : EMPTY_ARRAY;

  // Continuous (unwrapped) heading so the rotation spring always takes the
  // shortest path and never spins the long way around at the ±180° seam.
  const headingRef = useRef(0);
  // Snap (don't animate) the very first frame so the scene doesn't spin up from
  // an arbitrary zero heading on load.
  const initializedRef = useRef(false);

  // Live along-path distance: nearest path point to the projected GPS location.
  // Recomputed only when the location or route changes.
  const liveDistance = useMemo(() => {
    const coords = projectedLocation?.coords;
    if (!path || !coords || coords.length < 2) return 0;
    const [latitude, longitude] = coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return 0;

    const [east, north] = toLocalMeters(
      [latitude, longitude],
      path.baseLat,
      path.baseLon,
      path.cosBaseLat,
    );
    const targetX = east * PIXELS_PER_METER;
    const targetY = -north * PIXELS_PER_METER;

    let nearestIndex = 0;
    let nearestSquared = Infinity;
    for (let index = 0; index < path.points.length; index += 1) {
      const deltaX = path.points[index][0] - targetX;
      const deltaY = path.points[index][1] - targetY;
      const squared = deltaX * deltaX + deltaY * deltaY;
      if (squared < nearestSquared) {
        nearestSquared = squared;
        nearestIndex = index;
      }
    }
    return path.cumulative[nearestIndex] || 0;
  }, [path, projectedLocation?.coords]);

  // Camera target: the raw heading that should point up at the current
  // distance. Position is derived from the animated distance directly (see the
  // transform below) so the camera always lands exactly on the path instead of
  // cutting corners between interpolated x/y values.
  const rawHeading = useMemo(() => {
    if (!path) return 0;
    return forwardHeading(path.points, cumulativeDistances, liveDistance);
  }, [path, cumulativeDistances, liveDistance]);

  const [cameraSpring, springApi] = useSpring(() => ({
    distance: 0,
    rotation: 0,
    // Rotation glides more gently than the along-path motion to keep turns
    // smooth.
    config: (key) =>
      key === "rotation"
        ? { tension: 70, friction: 32 }
        : { tension: 120, friction: 26 },
  }));

  // Unwrap the heading relative to the previous one so the rotation spring
  // always takes the shortest path and never spins the long way at the ±180°
  // seam. When the heading is undefined (a switchback right ahead) keep the
  // previous one so the scene holds steady instead of spinning. Refs may be
  // read and written here (outside render).
  useEffect(() => {
    if (!path) return;
    let heading = headingRef.current;
    if (rawHeading !== null) {
      const previousHeading = headingRef.current;
      const shortestDelta =
        ((((rawHeading - previousHeading) % 360) + 540) % 360) - 180;
      heading = previousHeading + shortestDelta;
      headingRef.current = heading;
    }
    const target = { distance: liveDistance, rotation: heading };
    if (!initializedRef.current) {
      initializedRef.current = true;
      springApi.set(target);
      return;
    }
    springApi.start(target);
  }, [path, rawHeading, liveDistance, springApi]);

  const variant = theme.colors[theme.currentVariant];
  const routeColor = variant["--color-primary"];
  const userColor = variant["--color-accent"];

  if (!path) {
    return (
      <div className={className}>
        <div className="gps-view-message">No trail loaded.</div>
      </div>
    );
  }

  // Re-project the visible trail each animation frame from the spring's distance
  // and rotation, split at the user into the upcoming route (ahead, drawn bright
  // and faded into the horizon) and the travelled trail (behind, drawn muted and
  // running off the bottom). The user marker is drawn separately in flat screen
  // space (below) so it stays an upright circle, never tilted into an ellipse.
  const upcomingPath = to(
    [cameraSpring.distance, cameraSpring.rotation],
    (distance, rotation) =>
      buildProjectedPath(
        path.points,
        path.elevations,
        cumulativeDistances,
        distance,
        rotation,
        distance,
        distance + FAR_METERS,
      ),
  );
  const traveledPath = to(
    [cameraSpring.distance, cameraSpring.rotation],
    (distance, rotation) =>
      buildProjectedPath(
        path.points,
        path.elevations,
        cumulativeDistances,
        distance,
        rotation,
        distance - BEHIND_METERS,
        distance,
      ),
  );

  return (
    <div className={className}>
      <svg
        className="gps-view-canvas"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="GPS view of the upcoming trail"
      >
        <defs>
          {/* Distance fade. Because the perspective makes screen height a
              monotonic function of distance ahead, a vertical gradient fades
              exactly the far trail: fully visible at the user, dissolving to
              nothing by the vanishing row, so the upcoming route melts into the
              horizon instead of ending on a hard endpoint. */}
          <linearGradient
            id="gps-view-fade"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={HORIZON_Y}
            x2="0"
            y2={USER_Y}
          >
            <stop offset="0" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask id="gps-view-fade-mask">
            <rect
              x={-VIEW}
              y={-VIEW}
              width={VIEW * 3}
              height={VIEW * 3}
              fill="url(#gps-view-fade)"
            />
          </mask>
        </defs>
        <animated.path
          d={traveledPath}
          fill="none"
          stroke={routeColor}
          strokeOpacity={0.28}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <animated.path
          d={upcomingPath}
          fill="none"
          stroke={routeColor}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          mask="url(#gps-view-fade-mask)"
        />
        <g className="gps-view-user">
          <circle
            cx={USER_X}
            cy={USER_Y}
            r={14}
            fill={userColor}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={USER_X}
            cy={USER_Y}
            r={26}
            fill="none"
            stroke={userColor}
            strokeWidth={3}
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
});

const StyledGpsView = style(GpsView);

export default StyledGpsView;
