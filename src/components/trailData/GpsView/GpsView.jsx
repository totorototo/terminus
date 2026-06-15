import { memo, useEffect, useMemo, useRef, useState } from "react";

import { animated, to, useSpring } from "@react-spring/web";
import { useTheme } from "styled-components";

import useStore, { useProjectedLocation } from "../../../store/store.js";

import style from "./GpsView.style.js";

// The SVG uses a square viewBox; the user marker sits in the lower portion so
// most of the screen shows the trail ahead, like a turn-by-turn GPS view.
const VIEW = 1000;
const USER_X = VIEW / 2;
const USER_Y = VIEW * 0.72;

// Zoom level: 200m of trail ahead fills the space above the user marker.
const FORWARD_METERS = 200;
const PIXELS_PER_METER = USER_Y / FORWARD_METERS;

// The heading is the direction from the current position to a point this far
// ahead along the path. A single look-ahead chord rotates continuously through
// a turn, whereas averaging several forward direction vectors reverses abruptly
// at a hairpin apex (the opposing vectors cancel) and makes the scene spin.
const HEADING_CHORD_METERS = 40;

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

// Scrub sensitivity: how many metres along the path a single pixel of native
// scroll advances the position. Native scroll is used rather than wheel or drag
// gestures so touch devices — which emit no wheel events — can scrub by swiping
// vertically.
const METERS_PER_SCROLL_PIXEL = 0.5;

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
  const rawCumulative = [0];
  for (let index = 1; index < rawMeters.length; index += 1) {
    const deltaEast = rawMeters[index][0] - rawMeters[index - 1][0];
    const deltaNorth = rawMeters[index][1] - rawMeters[index - 1][1];
    rawCumulative[index] =
      rawCumulative[index - 1] + Math.hypot(deltaEast, deltaNorth);
  }
  const total = rawCumulative[rawMeters.length - 1] || 0;

  // Uniform resampling turns a dataless gap chord into evenly spaced points.
  const resampled = [];
  for (let distance = 0; distance <= total; distance += RESAMPLE_STEP_METERS) {
    resampled.push(sampleAt(rawMeters, rawCumulative, distance));
  }
  resampled.push(rawMeters[rawMeters.length - 1]);

  // Short moving average rounds the artificial corners at gap ends.
  const smoothed = resampled.map((point, index) => {
    let sumEast = 0;
    let sumNorth = 0;
    let count = 0;
    for (let offset = -SMOOTH_RADIUS; offset <= SMOOTH_RADIUS; offset += 1) {
      const neighbour = resampled[index + offset];
      if (neighbour) {
        sumEast += neighbour[0];
        sumNorth += neighbour[1];
        count += 1;
      }
    }
    return [sumEast / count, sumNorth / count];
  });

  const points = smoothed.map(([east, north]) => [
    east * PIXELS_PER_METER,
    -north * PIXELS_PER_METER,
  ]);
  const cumulative = [0];
  for (let index = 1; index < smoothed.length; index += 1) {
    const deltaEast = smoothed[index][0] - smoothed[index - 1][0];
    const deltaNorth = smoothed[index][1] - smoothed[index - 1][1];
    cumulative[index] =
      cumulative[index - 1] + Math.hypot(deltaEast, deltaNorth);
  }

  return { points, cumulative, baseLat, baseLon, cosBaseLat };
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

  // Distance scrubbed manually along the path. Null means "follow the live GPS
  // position"; any number switches to manual preview mode.
  const [previewMeters, setPreviewMeters] = useState(null);

  // Continuous (unwrapped) heading so the rotation spring always takes the
  // shortest path and never spins the long way around at the ±180° seam.
  const headingRef = useRef(0);
  // Snap (don't animate) the very first frame so the scene doesn't spin up from
  // an arbitrary zero heading on load.
  const initializedRef = useRef(false);
  // The native scroll container that drives manual scrubbing, plus a flag to
  // ignore the scroll events we trigger ourselves when syncing to live GPS.
  const scrollRef = useRef(null);
  const isSyncingScrollRef = useRef(false);

  const totalDistance =
    cumulativeDistances[cumulativeDistances.length - 1] || 0;

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

  const effectiveDistance = previewMeters ?? liveDistance;

  // Native scroll drives the scrub: the scroll container's offset maps directly
  // to a distance along the path. Touch swipes and desktop wheels both produce
  // scroll events, so this works on mobile where wheel events never fire.
  const handleScroll = (event) => {
    // Ignore the programmatic scrolls we issue to follow the live GPS position.
    if (isSyncingScrollRef.current) {
      isSyncingScrollRef.current = false;
      return;
    }
    const next = event.currentTarget.scrollTop * METERS_PER_SCROLL_PIXEL;
    setPreviewMeters(Math.min(Math.max(next, 0), totalDistance));
  };

  // The render path is static (built once from the trace); advancing the user
  // never recomputes it — only the camera moves.

  // Serialise the path once so the large points string isn't rebuilt on every
  // scroll frame.
  const pathPoints = useMemo(
    () => (path ? path.points.map(([x, y]) => `${x},${y}`).join(" ") : ""),
    [path],
  );

  // Camera target: the raw heading that should point up at the current
  // distance. Position is derived from the animated distance directly (see the
  // transform below) so the camera always lands exactly on the path instead of
  // cutting corners between interpolated x/y values.
  const rawHeading = useMemo(() => {
    if (!path) return 0;
    return forwardHeading(path.points, cumulativeDistances, effectiveDistance);
  }, [path, cumulativeDistances, effectiveDistance]);

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
    const target = { distance: effectiveDistance, rotation: heading };
    if (!initializedRef.current) {
      initializedRef.current = true;
      springApi.set(target);
      return;
    }
    springApi.start(target);
  }, [path, rawHeading, effectiveDistance, springApi]);

  // While following live GPS, keep the scroll offset aligned with the live
  // distance so a later swipe scrubs from the current spot instead of jumping.
  useEffect(() => {
    if (previewMeters !== null) return;
    const element = scrollRef.current;
    if (!element) return;
    // Clamp to the actual maximum scroll: setting scrollTop beyond it is a
    // no-op that fires no scroll event, which would leave the sync flag armed
    // and swallow the next genuine swipe.
    const maxScroll = element.scrollHeight - element.clientHeight;
    const target = Math.min(liveDistance / METERS_PER_SCROLL_PIXEL, maxScroll);
    if (Math.abs(element.scrollTop - target) > 0.5) {
      isSyncingScrollRef.current = true;
      element.scrollTop = target;
    }
  }, [previewMeters, liveDistance]);

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

  const isScrubbing = previewMeters !== null;
  // Derive the camera position from the animated distance so it follows the
  // path curve exactly and the user marker never drifts off the trail.
  const cameraTransform = to(
    [cameraSpring.distance, cameraSpring.rotation],
    (distance, rotation) => {
      const [x, y] = sampleAt(path.points, cumulativeDistances, distance);
      return `translate(${USER_X} ${USER_Y}) rotate(${rotation}) translate(${-x} ${-y})`;
    },
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
        <animated.g transform={cameraTransform}>
          <polyline
            points={pathPoints}
            fill="none"
            stroke={routeColor}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </animated.g>
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
      <div
        className="gps-view-scroll"
        ref={scrollRef}
        onScroll={handleScroll}
        aria-hidden="true"
      >
        {/* The +100% padding adds one viewport of extra scroll so the very end
            of the trail — otherwise hidden in the unscrollable last viewport —
            is still reachable. */}
        <div
          className="gps-view-spacer"
          style={{
            height: `calc(${totalDistance / METERS_PER_SCROLL_PIXEL}px + 100%)`,
          }}
        />
      </div>
      {isScrubbing && (
        <button
          type="button"
          className="gps-view-reset"
          onClick={() => setPreviewMeters(null)}
        >
          {(effectiveDistance / 1000).toFixed(2)} km · tap to follow
        </button>
      )}
    </div>
  );
});

export default style(GpsView);
