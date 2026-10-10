// GPS Processing Web Worker
// This runs GPS computations off the main thread to prevent UI freezing
// Trace objects live in WASM memory and must be freed with .deinit(). Query
// handlers share one resident Trace (see getResidentTrace); only traces created
// outside the cache (getRouteSection, readGPXComplete results) are freed per call.

// zig/terminus.zig is a thin boundary over the gpxz library. gpxz's structs
// use snake_case, unit-suffixed fields (distance_m, epoch_s_start, ...); the
// sanitizers below rename them to the camelCase shapes the store expects, so
// this file is the only place that knows gpxz's field names.
import {
  __zigar,
  readGPXComplete,
  recalibrate as recalibrateRoute,
  Route,
  Trace,
} from "../zig/terminus.zig";

// Initialize Zig/WASM in worker context
let isInitialized = false;

async function initializeZig() {
  if (!isInitialized) {
    const { init } = __zigar;
    await init();
    isInitialized = true;
  }
}

// ── Resident trace cache ──────────────────────────────────────────────────────
// Trace.init is expensive: it runs Douglas-Peucker simplification, median-
// smoothed gain/loss, windowed slopes, AMPD peak/valley detection and climb
// qualification. Query messages (closest point, points at distances, section
// stats) all operate on the same route, and findClosestLocation fires on every
// GPS fix — so the worker keeps one resident Trace and only rebuilds it when
// the incoming coordinates actually change.
//
// Coordinates arrive by structured clone, so reference identity can't be used;
// a cheap fingerprint (length + first/middle/last point) identifies the route
// for callers that always send coordinates. Callers that fire at fix-rate
// (findClosestLocation) instead pass a `routeVersion` handshake token: once
// the worker has a resident trace tagged with that version, it can be reused
// on every subsequent call without the caller re-cloning the whole coordinate
// array through postMessage each time (see findClosestLocation below).

let residentTrace = null;
let residentTraceKey = null;

function traceKeyFor(coordinates) {
  const n = coordinates.length;
  if (n === 0) return "empty";
  const first = coordinates[0];
  const mid = coordinates[n >> 1];
  const last = coordinates[n - 1];
  // Sampling only 3 points can't distinguish two routes of equal length that
  // happen to agree at those indices but diverge elsewhere (e.g. an edited
  // waypoint in the middle of one half). The coordinates array was already
  // fully materialized by postMessage's structured clone, so a single-pass
  // checksum over every point is negligible next to that cost, and negligible
  // next to Trace.init's Douglas-Peucker/smoothing work it lets us skip.
  let checksum = 0;
  for (let i = 0; i < n; i++) {
    const p = coordinates[i];
    checksum = (checksum * 31 + p[0] * 1e6 + p[1] * 1e6 + p[2]) % 1_000_000_007;
  }
  return `${n}:${first[0]},${first[1]},${first[2]}:${mid[0]},${mid[1]},${mid[2]}:${last[0]},${last[1]},${last[2]}:${checksum}`;
}

/**
 * Return the resident Trace for these coordinates, rebuilding it only when the
 * fingerprint changes. The cache owns the Trace — callers must NOT deinit it.
 *
 * `routeVersion`, when provided, is a cheap caller-supplied handshake token
 * (e.g. incremented once per loaded GPX file) that keys the cache instead of
 * fingerprinting `coordinates`. This lets a caller omit `coordinates` on
 * repeat calls once the worker already holds the matching trace — the
 * fix-rate `findClosestLocation` path relies on this to avoid re-sending the
 * full route on every GPS fix. `coordinates` is required on the first call
 * for a given routeVersion (cache miss).
 */
function getResidentTrace(coordinates, routeVersion) {
  const key =
    routeVersion != null ? `v:${routeVersion}` : traceKeyFor(coordinates);
  if (residentTrace !== null && key === residentTraceKey) {
    return residentTrace;
  }
  if (!coordinates) {
    throw new Error(
      "No coordinates provided and no resident trace matches this routeVersion",
    );
  }
  if (residentTrace !== null) {
    residentTrace.deinit();
    residentTrace = null;
    residentTraceKey = null;
  }
  const trace = Trace.init(coordinates);
  residentTrace = trace;
  residentTraceKey = key;
  return trace;
}

// ── Resident route (parsed GPX) for live recalibration ───────────────────────
// Recalibration fires on every GPS fix. Parsing the GPX bytes and rebuilding
// the trace + waypoints per tick is far more expensive than the recalibration
// itself, so PROCESS_GPX_FILE retains the raw bytes and the first RECALIBRATE
// parses them once into a resident Route that later ticks reuse.

let residentRouteBytes = null;
let residentRoute = null;

/**
 * Return the resident Route, lazily parsing `bytes` on first use. The cache
 * owns the Route — callers must NOT deinit it.
 */
async function getResidentRoute(bytes) {
  if (residentRoute === null) {
    residentRoute = await Route.init(bytes);
  }
  return residentRoute;
}

/** Drop the resident Route (a new GPX file invalidates it). */
function clearResidentRoute() {
  if (residentRoute !== null) {
    residentRoute.deinit();
    residentRoute = null;
  }
  residentRouteBytes = null;
}

/** Test hook: drop cached WASM state so mocks don't leak across tests. */
export function __resetWorkerCachesForTests() {
  residentTrace = null;
  residentTraceKey = null;
  residentRoute = null;
  residentRouteBytes = null;
}

// ── Performance timing helpers ────────────────────────────────────────────────
// Wrap each WASM call with performance.mark/measure so the timings are visible
// in DevTools' Performance panel and can be read back in e2e tests.

function markStart(label) {
  try {
    performance.mark(`worker:${label}:start`);
  } catch {
    // Non-fatal — some environments don't support performance.mark in workers
  }
}

function markEnd(label) {
  try {
    performance.mark(`worker:${label}:end`);
    performance.measure(
      `worker:${label}`,
      `worker:${label}:start`,
      `worker:${label}:end`,
    );
  } catch {
    // Non-fatal
  }
}

/** Return duration in ms for the most-recent measure with the given name, or null. */
function measureMs(label) {
  try {
    const entries = performance.getEntriesByName(`worker:${label}`);
    return entries.length > 0 ? entries[entries.length - 1].duration : null;
  } catch {
    return null;
  }
}

// ── Trace sanitization ────────────────────────────────────────────────────────
// Trace.points is [][3]f64 in Zig — an array of fixed-size structs. Walking it
// with Zigar's generic .valueOf() pays one proxy trap per field per point
// (3 traps * N points) to build a nested JS array. Trace also exposes the same
// backing memory flattened as points_flat ([]f64, stride 3), so its `.typedArray`
// is a single zero-copy Float64Array view — reshaping that with a flat loop is
// far cheaper than the proxy-recursive path, for the same [[lat,lon,ele], ...]
// output shape callers already expect.

/** Reshape a flat stride-3 [lat, lon, ele, ...] buffer into [[lat,lon,ele], ...]. */
function flattenToTriples(flat) {
  const n = flat.length / 3;
  const points = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    points[i] = [flat[o], flat[o + 1], flat[o + 2]];
  }
  return points;
}

/** Sanitize climb segments — all fields are numeric (usize/f64), no strings or i64. */
function sanitizeClimbs(traceClimbs) {
  const sanitizedClimbs = [];
  if (traceClimbs) {
    for (let i = 0; i < traceClimbs.length; i++) {
      const c = traceClimbs[i].valueOf();
      sanitizedClimbs.push({
        startIndex: Number(c.index_start),
        endIndex: Number(c.index_end),
        startDistM: c.distance_m_start,
        climbDistM: c.distance_m,
        elevationGain: c.elevation_gain_m,
        summitElev: c.elevation_m_summit,
        avgGradient: c.gradient_percent_average,
      });
    }
  }
  return sanitizedClimbs;
}

/**
 * Convert a Zigar Trace to plain JS, avoiding the expensive per-point proxy
 * walk for `points` (see above). `sanitizedClimbs` is optional pre-sanitized
 * climbs data to reuse instead of re-deriving it from the proxy.
 */
function sanitizeTrace(trace, sanitizedClimbs) {
  const flat = trace.points_flat;
  const points = flat ? flattenToTriples(flat.typedArray ?? flat) : [];

  return {
    points,
    slopes: trace.slopes_percent.valueOf(),
    paceFactors: trace.pace_factors.valueOf(),
    cumulativeDistances: trace.distances_m_cumulative.valueOf(),
    cumulativeElevations: trace.elevation_gains_m_cumulative.valueOf(),
    cumulativeElevationLoss: trace.elevation_losses_m_cumulative.valueOf(),
    peaks: trace.peaks.valueOf(),
    valleys: trace.valleys.valueOf(),
    climbs: sanitizedClimbs ?? sanitizeClimbs(trace.climbs),
    totalDistance: trace.distance_m,
    totalElevation: trace.elevation_gain_m,
    totalElevationLoss: trace.elevation_loss_m,
  };
}

/** `Number()` for a nullable Zig i64 (a BigInt in JS), keeping null. */
function epochOrNull(value) {
  return value !== null ? Number(value) : null;
}

/** The fields legs, sections and stages share, from an already-copied valueOf(). */
function sanitizeIntervalCommon(d) {
  return {
    startIndex: d.index_start,
    endIndex: d.index_end,
    pointCount: d.point_count,
    startPoint: d.point_start,
    endPoint: d.point_end,
    totalDistance: d.distance_m,
    totalElevation: d.elevation_gain_m,
    totalElevationLoss: d.elevation_loss_m,
    avgSlope: d.slope_percent_average,
    maxSlope: d.slope_percent_max,
    minElevation: d.elevation_m_min,
    maxElevation: d.elevation_m_max,
    bearing: d.bearing_degrees,
    difficulty: d.difficulty,
    estimatedDuration: d.duration_s_estimated,
  };
}

/** The cutoff and pace fields sections and stages add over legs. */
function sanitizeIntervalTiming(d) {
  return {
    startTime: epochOrNull(d.epoch_s_start),
    endTime: epochOrNull(d.epoch_s_end),
    paceFactor: d.pace_factor,
    effortFactor: d.effort_factor,
    maxCompletionTime: epochOrNull(d.duration_s_cutoff),
    cutoffRatio: d.cutoff_ratio,
    stopDuration: d.stop_s,
  };
}

/**
 * Build a Zig `WeatherLookup` (parallel name/value arrays) from a forecast map
 * keyed by checkpoint name. The values are converted from the store's forecast
 * shape ({ temp, humidity, wind, precipitation }) to the Zig field names
 * ({ temperature_c, humidity_percent, wind_kmh, precipitation_probability_percent }).
 *
 * Returns the neutral (empty) lookup when no forecasts are provided, so the
 * estimate is unchanged. Entries missing a field fall back to neutral-ish
 * defaults that contribute no penalty (cool, dry, calm, average humidity).
 */
function buildWeatherLookup(weatherByCheckpoint) {
  const names = [];
  const values = [];
  if (weatherByCheckpoint) {
    for (const [name, f] of Object.entries(weatherByCheckpoint)) {
      if (!f) continue;
      names.push(name);
      values.push({
        temperature_c: Number.isFinite(f.temp) ? f.temp : 12.0,
        humidity_percent: Number.isFinite(f.humidity) ? f.humidity : 50.0,
        wind_kmh: Number.isFinite(f.wind) ? f.wind : 0.0,
        precipitation_probability_percent: Number.isFinite(f.precipitation)
          ? f.precipitation
          : 0.0,
      });
    }
  }
  return { names, values };
}

// Message handler for communication with main thread
self.onmessage = async function (e) {
  const { type, data, id } = e.data;

  try {
    await initializeZig();

    switch (type) {
      case "PROCESS_GPX_FILE":
        await processGPXFile(data, id);
        break;

      case "FIND_POINTS_AT_DISTANCES":
        await findPointsAtDistances(data, id);
        break;

      case "GET_ROUTE_SECTION":
        await getRouteSection(data, id);
        break;

      case "FIND_CLOSEST_LOCATION":
        await findClosestLocation(data, id);
        break;

      case "RECALIBRATE":
        await recalibrate(data, id);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: "ERROR",
      id,
      error: error.message,
    });
  }
};

async function processGPXFile(gpxFileBytes, requestId) {
  markStart("processGPXFile");
  const {
    basePaceSPerKm = 500.0,
    kFatigue = 0.002,
    lifeBaseStopS = 3600,
    weatherByCheckpoint = null,
  } = gpxFileBytes;

  // Retain the raw bytes for live recalibration (parsed lazily on the first
  // RECALIBRATE) and drop any route parsed from a previous file.
  clearResidentRoute();
  residentRouteBytes = gpxFileBytes.gpxBytes;

  // Build the Zig WeatherLookup (parallel name/value arrays) from the forecast
  // map. Keys are checkpoint names; an absent map leaves every section neutral.
  const weather = buildWeatherLookup(weatherByCheckpoint);

  const gpxData = await readGPXComplete(
    gpxFileBytes.gpxBytes,
    basePaceSPerKm,
    kFatigue,
    lifeBaseStopS,
    weather,
  );
  try {
    await sanitizeAndPostGPXResults(gpxData, requestId);
  } finally {
    // Frees the trace and all parse allocations even when sanitization throws
    // (the onmessage catch only posts an ERROR — it cannot free WASM memory).
    gpxData.deinit();
  }
}

async function sanitizeAndPostGPXResults(gpxData, requestId) {
  // Convert Zigar proxy objects to plain JS before sending
  // Note: Zig string fields ([]const u8) need .string property to convert to JS strings
  // Note: Zig i64 fields need explicit Number() conversion (they become BigInt in JS)

  // Legs: wpt-to-wpt, no timing info
  let sanitizedLegs = [];
  if (gpxData.legs) {
    for (let i = 0; i < gpxData.legs.length; i++) {
      const leg = gpxData.legs[i];
      const legData = leg.valueOf();
      const startLocation = leg.location_start.string;
      const endLocation = leg.location_end.string;
      sanitizedLegs.push({
        legId: legData.leg_index,
        sectionIdx: legData.section_index,
        ...sanitizeIntervalCommon(legData),
        segmentId: `leg-${legData.section_index}-${startLocation}-${endLocation}`,
        startLocation,
        endLocation,
      });
    }
  }

  // Sections: section-boundary-to-section-boundary, includes timing info
  let sanitizedSections = [];
  if (gpxData.sections) {
    for (let i = 0; i < gpxData.sections.length; i++) {
      const section = gpxData.sections[i];
      const sectionData = section.valueOf();
      const startLocation = section.location_start.string;
      const endLocation = section.location_end.string;
      sanitizedSections.push({
        stageIdx: sectionData.stage_index,
        ...sanitizeIntervalCommon(sectionData),
        ...sanitizeIntervalTiming(sectionData),
        sectionId: `section-${sectionData.stage_index}-${startLocation}-${endLocation}`,
        startLocation,
        endLocation,
      });
    }
  }

  // Stages: stage-boundary-to-stage-boundary (Start/LifeBase/Arrival), includes timing info
  let sanitizedStages = [];
  if (gpxData.stages) {
    for (let i = 0; i < gpxData.stages.length; i++) {
      const stage = gpxData.stages[i];
      const stageData = stage.valueOf();
      const startLocation = stage.location_start.string;
      const endLocation = stage.location_end.string;
      sanitizedStages.push({
        ...sanitizeIntervalCommon(stageData),
        ...sanitizeIntervalTiming(stageData),
        stageId: `stage-${startLocation}-${endLocation}`,
        startLocation,
        endLocation,
      });
    }
  }

  // Sanitize waypoints - include new fields, convert BigInt time to Number
  const sanitizedWaypoints = [];
  for (let i = 0; i < gpxData.waypoints.length; i++) {
    const wpt = gpxData.waypoints[i];
    sanitizedWaypoints.push({
      lat: wpt.latitude,
      lon: wpt.longitude,
      ele: wpt.elevation_m !== null ? wpt.elevation_m : null,
      name: wpt.name.string,
      desc: wpt.description ? wpt.description.string : null,
      cmt: wpt.comment ? wpt.comment.string : null,
      sym: wpt.symbol ? wpt.symbol.string : null,
      wptType: wpt.type_name ? wpt.type_name.string : null,
      time: wpt.epoch_s ? Number(wpt.epoch_s) : null,
    });
  }

  const metadata = {
    name: gpxData.metadata.name ? gpxData.metadata.name.string : null,
    description: gpxData.metadata.description
      ? gpxData.metadata.description.string
      : null,
  };

  // Full-resolution route coordinates for the map. Zig hands back a flat
  // [lat, lon, ele, ...] []f64 (stride 3); its `.typedArray` is a zero-copy
  // Float64Array view into WASM memory, so one Float64Array construction is
  // the only copy — into a fresh transferable buffer (the WASM view itself
  // must never be transferred or WASM memory would be detached). The map swaps
  // to [lng, lat] at read time, and the store never holds the raw XML string.
  const fullResPoints = gpxData.points_full_resolution;
  const routeLatLonEle = fullResPoints
    ? new Float64Array(fullResPoints.typedArray ?? fullResPoints)
    : new Float64Array(0);

  // Sanitize climb segments once and reuse for both the top-level `climbs` and
  // `trace.climbs` — avoids sanitizing the same proxy data twice.
  const sanitizedClimbs = sanitizeClimbs(gpxData.trace.climbs);

  const results = {
    metadata,
    trace: sanitizeTrace(gpxData.trace, sanitizedClimbs),
    waypoints: sanitizedWaypoints,
    legs: sanitizedLegs,
    sections: sanitizedSections,
    stages: sanitizedStages,
    climbs: sanitizedClimbs,
    routeLatLonEle,
  };

  markEnd("processGPXFile");

  self.postMessage(
    {
      type: "GPX_FILE_PROCESSED",
      id: requestId,
      results,
      timingMs: { gpxProcess: measureMs("processGPXFile") },
    },
    [routeLatLonEle.buffer],
  );
}

// Find multiple points at specified distances (light computation)
async function findPointsAtDistances(data, requestId) {
  const { coordinates, distances } = data;
  const trace = getResidentTrace(coordinates);

  const points = distances
    .map((distance) => {
      const point = trace.point_at_distance(distance);
      return {
        distance,
        // Read directly from WASM instead of calling .valueOf()
        point: point ? [point[0], point[1], point[2]] : null,
      };
    })
    .filter((item) => item.point !== null);

  self.postMessage({
    type: "POINTS_FOUND",
    id: requestId,
    points,
  });
}

// Get route section between two points (light computation)
async function getRouteSection(data, requestId) {
  const { coordinates, start, end } = data;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > coordinates.length ||
    start >= end
  )
    throw new Error("Invalid section range");
  const section = coordinates.slice(start, end); // Copy to avoid modifying original

  // Ephemeral trace on purpose: this operates on a per-call sub-slice, and
  // caching it would evict the resident full-route trace on every request.
  const trace = Trace.init(section);
  try {
    self.postMessage({
      type: "ROUTE_SECTION_READY",
      id: requestId,
      section: {
        totalDistance: trace.distance_m,
        totalElevation: trace.elevation_gain_m,
        totalElevationLoss: trace.elevation_loss_m,
      },
    });
  } finally {
    trace.deinit();
  }
}

// Recalibrate section and stage ETAs against the resident parsed route. Either
// kind is null when the route has fewer than two boundaries of that kind.
async function recalibrate(data, requestId) {
  markStart("recalibrate");
  const {
    gpxBytes = null,
    currentIndex = 0,
    actualElapsedS = 0,
    basePaceSPerKm = 500.0,
    kFatigue = 0.002,
    lifeBaseStopS = 3600,
    weatherByCheckpoint = null,
  } = data;

  const weather = buildWeatherLookup(weatherByCheckpoint);

  // Steady state: bytes were retained by PROCESS_GPX_FILE and the route is
  // parsed once. Explicit gpxBytes in the payload is a fallback for callers
  // that recalibrate without loading a file through this worker first.
  const bytes = residentRouteBytes ?? gpxBytes;
  if (bytes == null) {
    throw new Error("No GPX route loaded for recalibration");
  }
  const route = await getResidentRoute(bytes);

  const result = await recalibrateRoute(
    route,
    currentIndex,
    actualElapsedS,
    basePaceSPerKm,
    kFatigue,
    lifeBaseStopS,
    weather,
  );

  // Copy the Zigar proxy to plain JS. On wasm32, usize is 32-bit and already a
  // Number; Number() is kept as a cheap guard should the target ever be wasm64.
  const sanitizeKind = (recalibration, kind) => {
    if (!recalibration) return null;
    const etas = [];
    for (let index = 0; index < recalibration.etas.length; index++) {
      const eta = recalibration.etas[index].valueOf();
      etas.push({
        id: Number(eta.index),
        endIndex: Number(eta.index_end),
        remainingDurationS: eta.duration_s_remaining,
        cumulativeRemainingS: eta.duration_s_remaining_cumulative,
      });
    }
    return {
      kind,
      calibrationFactor: recalibration.calibration_factor,
      calibratedBasePaceSPerKm: recalibration.pace_base_s_per_km_calibrated,
      predictedSoFarS: recalibration.duration_s_predicted,
      actualElapsedS: recalibration.duration_s_actual,
      etas,
    };
  };

  let sanitized;
  try {
    sanitized = {
      section: sanitizeKind(result.section, "section"),
      stage: sanitizeKind(result.stage, "stage"),
    };
  } finally {
    result.deinit();
  }

  markEnd("recalibrate");

  // The messenger leaks the raw envelope to callers when `results` is null.
  self.postMessage({
    type: "RECALIBRATED",
    id: requestId,
    results: { recalibration: sanitized },
    timingMs: { recalibrate: measureMs("recalibrate") },
  });
}

// Find closest point to target location. `coordinates` may be omitted once
// the caller has confirmed (via `routeVersion`) that the worker already holds
// the matching resident trace — see getResidentTrace's doc comment. This is
// what lets spotMe()'s per-GPS-fix calls avoid re-cloning the whole route
// through postMessage on every fix.
async function findClosestLocation(data, requestId) {
  const { coordinates, target, routeVersion } = data;
  const trace = getResidentTrace(coordinates, routeVersion);

  // Null on an empty trace — report "nothing found" instead of crashing.
  const closest = trace.closest_point(target);

  self.postMessage({
    type: "CLOSEST_POINT_FOUND",
    id: requestId,
    // Read directly from WASM instead of calling .valueOf()
    closestLocation: closest?.point
      ? [closest.point[0], closest.point[1], closest.point[2]]
      : null,
    closestIndex: closest?.index ?? null,
    deviationDistance: closest?.distance_m ?? 0,
  });
}
