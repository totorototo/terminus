// GPS Processing Web Worker
// This runs GPS computations off the main thread to prevent UI freezing
// Trace objects live in WASM memory and must be freed with .deinit(). Query
// handlers share one resident Trace (see getResidentTrace); only traces created
// outside the cache (getRouteSection, readGPXComplete results) are freed per call.

import { readGPXComplete, Route } from "../zig/gpx.zig";
import { generateAudioFrames } from "../zig/soundscape.zig";
import { __zigar, Trace } from "../zig/trace.zig";

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
// backing memory flattened as pointsFlat ([]f64, stride 3), so its `.typedArray`
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
        startIndex: Number(c.startIndex),
        endIndex: Number(c.endIndex),
        startDistM: c.startDistM,
        climbDistM: c.climbDistM,
        elevationGain: c.elevationGain,
        summitElev: c.summitElev,
        avgGradient: c.avgGradient,
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
  const flat = trace.pointsFlat;
  const points = flat ? flattenToTriples(flat.typedArray ?? flat) : [];

  return {
    points,
    slopes: trace.slopes.valueOf(),
    cumulativeDistances: trace.cumulativeDistances.valueOf(),
    cumulativeElevations: trace.cumulativeElevations.valueOf(),
    cumulativeElevationLoss: trace.cumulativeElevationLoss.valueOf(),
    peaks: trace.peaks.valueOf(),
    valleys: trace.valleys.valueOf(),
    climbs: sanitizedClimbs ?? sanitizeClimbs(trace.climbs),
    totalDistance: trace.totalDistance,
    totalElevation: trace.totalElevation,
    totalElevationLoss: trace.totalElevationLoss,
  };
}

/**
 * Build a Zig `WeatherLookup` (parallel name/value arrays) from a forecast map
 * keyed by checkpoint name. The values are converted from the store's forecast
 * shape ({ temp, humidity, wind, precipitation }) to the Zig field names
 * ({ temperature_c, humidity_pct, wind_kmh, precip_prob_pct }).
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
        humidity_pct: Number.isFinite(f.humidity) ? f.humidity : 50.0,
        wind_kmh: Number.isFinite(f.wind) ? f.wind : 0.0,
        precip_prob_pct: Number.isFinite(f.precipitation)
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

      case "GENERATE_AUDIO_FRAMES":
        await generateSoundscapeFrames(data, id);
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
      const startLocation = leg.startLocation.string;
      const endLocation = leg.endLocation.string;
      sanitizedLegs.push({
        ...legData,
        segmentId: `leg-${legData.sectionIdx}-${startLocation}-${endLocation}`,
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
      const startLocation = section.startLocation.string;
      const endLocation = section.endLocation.string;
      sanitizedSections.push({
        ...sectionData,
        sectionId: `section-${sectionData.stageIdx}-${startLocation}-${endLocation}`,
        startLocation,
        endLocation,
        startTime:
          sectionData.startTime !== null ? Number(sectionData.startTime) : null,
        endTime:
          sectionData.endTime !== null ? Number(sectionData.endTime) : null,
        maxCompletionTime:
          sectionData.maxCompletionTime !== null
            ? Number(sectionData.maxCompletionTime)
            : null,
      });
    }
  }

  // Stages: stage-boundary-to-stage-boundary (Start/LifeBase/Arrival), includes timing info
  let sanitizedStages = [];
  if (gpxData.stages) {
    for (let i = 0; i < gpxData.stages.length; i++) {
      const stage = gpxData.stages[i];
      const stageData = stage.valueOf();
      const startLocation = stage.startLocation.string;
      const endLocation = stage.endLocation.string;
      sanitizedStages.push({
        ...stageData,
        stageId: `stage-${startLocation}-${endLocation}`,
        startLocation,
        endLocation,
        startTime:
          stageData.startTime !== null ? Number(stageData.startTime) : null,
        endTime: stageData.endTime !== null ? Number(stageData.endTime) : null,
        maxCompletionTime:
          stageData.maxCompletionTime !== null
            ? Number(stageData.maxCompletionTime)
            : null,
      });
    }
  }

  // Sanitize waypoints - include new fields, convert BigInt time to Number
  const sanitizedWaypoints = [];
  for (let i = 0; i < gpxData.waypoints.length; i++) {
    const wpt = gpxData.waypoints[i];
    sanitizedWaypoints.push({
      lat: wpt.lat,
      lon: wpt.lon,
      ele: wpt.ele !== null ? wpt.ele : null,
      name: wpt.name.string,
      desc: wpt.desc ? wpt.desc.string : null,
      cmt: wpt.cmt ? wpt.cmt.string : null,
      sym: wpt.sym ? wpt.sym.string : null,
      wptType: wpt.wptType ? wpt.wptType.string : null,
      time: wpt.time ? Number(wpt.time) : null,
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
  const fullResPoints = gpxData.fullResPoints;
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
      const point = trace.pointAtDistance(distance);
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
        totalDistance: trace.totalDistance,
        totalElevation: trace.totalElevation,
        totalElevationLoss: trace.totalElevationLoss,
      },
    });
  } finally {
    trace.deinit();
  }
}

// Generate soundscape AudioFrame[] from pre-computed trace arrays
async function generateSoundscapeFrames(data, requestId) {
  markStart("generateAudioFrames");
  const { elevations, distances, slopes, sections = [] } = data;
  const n = elevations.length;

  // Build per-point bearing and pace arrays from section data.
  // Each point gets the bearing/pace of the section it falls in.
  // Points not covered by any section default to 0 (handled gracefully in Zig).
  const bearings = new Float64Array(n);
  const paces = new Float64Array(n);
  for (const section of sections) {
    const { startIndex, endIndex, bearing, estimatedDuration, totalDistance } =
      section;
    const pace = totalDistance > 0 ? estimatedDuration / totalDistance : 0;
    for (let i = startIndex; i <= endIndex && i < n; i++) {
      bearings[i] = bearing;
      paces[i] = pace;
    }
  }

  const zigFrames = await generateAudioFrames(
    elevations,
    distances,
    slopes,
    bearings,
    paces,
  );

  // Copy Zigar proxy structs to plain JS before postMessage
  const frames = [];
  for (let i = 0; i < zigFrames.length; i++) {
    const f = zigFrames[i].valueOf();
    frames.push({
      t: f.t,
      distance: f.distance,
      pitch: f.pitch,
      intensity: f.intensity,
      timbre: f.timbre,
      bearing: f.bearing,
      pace: f.pace,
    });
  }

  markEnd("generateAudioFrames");

  self.postMessage({
    type: "AUDIO_FRAMES_READY",
    id: requestId,
    results: { frames },
    timingMs: { audioFrames: measureMs("generateAudioFrames") },
  });
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

  const result = await route.recalibrateBoth(
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
        id: Number(eta.id),
        endIndex: Number(eta.endIndex),
        remainingDurationS: eta.remainingDurationS,
        cumulativeRemainingS: eta.cumulativeRemainingS,
      });
    }
    return {
      kind,
      calibrationFactor: recalibration.calibrationFactor,
      calibratedBasePaceSPerKm: recalibration.calibratedBasePaceSPerKm,
      predictedSoFarS: recalibration.predictedSoFarS,
      actualElapsedS: recalibration.actualElapsedS,
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
  const closest = trace.findClosestPoint(target);

  self.postMessage({
    type: "CLOSEST_POINT_FOUND",
    id: requestId,
    // Read directly from WASM instead of calling .valueOf()
    closestLocation: closest?.point
      ? [closest.point[0], closest.point[1], closest.point[2]]
      : null,
    closestIndex: closest?.index ?? null,
    deviationDistance: closest?.distance ?? 0,
  });
}
