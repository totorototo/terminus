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
// a cheap fingerprint (length + first/middle/last point) identifies the route.

let residentTrace = null;
let residentTraceKey = null;

function traceKeyFor(coordinates) {
  const n = coordinates.length;
  if (n === 0) return "empty";
  const first = coordinates[0];
  const mid = coordinates[n >> 1];
  const last = coordinates[n - 1];
  return `${n}:${first[0]},${first[1]},${first[2]}:${mid[0]},${mid[1]},${mid[2]}:${last[0]},${last[1]},${last[2]}`;
}

/**
 * Return the resident Trace for these coordinates, rebuilding it only when the
 * fingerprint changes. The cache owns the Trace — callers must NOT deinit it.
 */
function getResidentTrace(coordinates) {
  const key = traceKeyFor(coordinates);
  if (residentTrace !== null && key === residentTraceKey) {
    return residentTrace;
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

      case "PROCESS_GPS_DATA":
        await processGPSData(data, id);
        break;

      case "PROCESS_SECTIONS":
        await processSections(data, id);
        break;

      case "CALCULATE_ROUTE_STATS":
        await calculateRouteStats(data, id);
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

  // Sanitize climb segments — all fields are numeric (usize/f64), no strings or i64
  const sanitizedClimbs = [];
  const traceClimbs = gpxData.trace.climbs;
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

  const results = {
    metadata,
    trace: gpxData.trace.valueOf(),
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

async function processGPSData(gpsData, requestId) {
  markStart("processGPSData");
  const trace = getResidentTrace(gpsData.coordinates);

  self.postMessage({
    type: "PROGRESS",
    id: requestId,
    progress: 25,
    message: "Trace initialized...",
  });

  self.postMessage({
    type: "PROGRESS",
    id: requestId,
    progress: 75,
    message: "Calculating statistics...",
  });

  // Convert to plain JS object before posting (never post Zigar proxies)
  const results = trace.valueOf();

  markEnd("processGPSData");

  self.postMessage({
    type: "GPS_DATA_PROCESSED",
    id: requestId,
    results,
    timingMs: { gpsProcess: measureMs("processGPSData") },
  });
}

async function processSections(data, requestId) {
  markStart("processSections");
  const { coordinates, sections } = data;

  // Validate coordinates before creating trace
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    throw new Error("Invalid coordinates data");
  }

  const trace = getResidentTrace(coordinates);

  // Send progress updates during processing
  self.postMessage({
    type: "PROGRESS",
    id: requestId,
    progress: 25,
    message: "Trace initialized...",
  });

  // One deep copy of the points via valueOf() instead of paying three Zigar
  // proxy traps per point when slicing section ranges below.
  const allPoints = trace.points.valueOf();

  const results = sections.map((section) => {
    const {
      startKm,
      endKm,
      startCheckpoint: { location: startLocation },
      endCheckpoint: { location: endLocation },
    } = section;

    const startIndex = trace.findIndexAtDistance(startKm * 1000);
    const endIndex = trace.findIndexAtDistance(endKm * 1000);

    // Calculate section statistics directly from main trace using indices
    // This avoids creating sub-traces and stays in WASM memory (zero-copy)
    let sectionDistance = 0;
    let sectionElevation = 0;
    let sectionElevationLoss = 0;
    let sectionPoints = [];

    if (startIndex < endIndex && endIndex < trace.cumulativeDistances.length) {
      sectionDistance =
        trace.cumulativeDistances[endIndex] -
        trace.cumulativeDistances[startIndex];
      sectionElevation =
        trace.cumulativeElevations[endIndex] -
        trace.cumulativeElevations[startIndex];
      sectionElevationLoss =
        trace.cumulativeElevationLoss[endIndex] -
        trace.cumulativeElevationLoss[startIndex];

      sectionPoints = allPoints.slice(startIndex, endIndex + 1);
    }

    const startPoint = trace.pointAtDistance(startKm * 1000);
    const endPoint = trace.pointAtDistance(endKm * 1000);

    // Extract data before cleanup - convert Zigar proxies to plain JS
    const result = {
      segmentId: section.id,
      pointCount: sectionPoints.length,
      startKm,
      endKm,
      points: sectionPoints,
      startPoint: startPoint
        ? [startPoint[0], startPoint[1], startPoint[2]]
        : null,
      endPoint: endPoint ? [endPoint[0], endPoint[1], endPoint[2]] : null,
      startLocation,
      endLocation,
      totalDistance: sectionDistance,
      totalElevation: sectionElevation,
      totalElevationLoss: sectionElevationLoss,
      startIndex,
      endIndex,
    };

    return result;
  });

  // Attach summary properties so validateSectionsResults passes
  results.totalDistance = results.reduce(
    (sum, s) => sum + (s.totalDistance || 0),
    0,
  );
  results.totalElevationGain = results.reduce(
    (sum, s) => sum + (s.totalElevation || 0),
    0,
  );
  results.totalElevationLoss = results.reduce(
    (sum, s) => sum + (s.totalElevationLoss || 0),
    0,
  );
  results.pointCount = results.reduce((sum, s) => sum + (s.pointCount || 0), 0);

  markEnd("processSections");

  self.postMessage({
    type: "SECTIONS_PROCESSED",
    id: requestId,
    results,
    timingMs: { sectionsProcess: measureMs("processSections") },
  });
}

// Calculate route statistics (moderate computation)
async function calculateRouteStats(data, requestId) {
  const { coordinates, segments } = data;
  const trace = getResidentTrace(coordinates);
  const maxDistance = trace.totalDistance;

  const stats = segments.map((segment) => {
    // Validate and clamp distances to trace bounds
    const startDist = Math.max(0, Math.min(segment.start, maxDistance));
    const endDist = Math.max(startDist, Math.min(segment.end, maxDistance));

    const sectionPoints = trace.sliceBetweenDistances(startDist, endDist);
    const startPoint = trace.pointAtDistance(startDist);
    const endPoint = trace.pointAtDistance(endDist);

    return {
      segmentId: segment.id,
      distance: endDist - startDist,
      pointCount: sectionPoints?.length ?? 0,
      // Read directly from WASM instead of calling .valueOf()
      startPoint: startPoint
        ? [startPoint[0], startPoint[1], startPoint[2]]
        : null,
      endPoint: endPoint ? [endPoint[0], endPoint[1], endPoint[2]] : null,
    };
  });

  self.postMessage({
    type: "ROUTE_STATS_CALCULATED",
    id: requestId,
    stats,
  });
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

// Find closest point to target location
async function findClosestLocation(data, requestId) {
  const { coordinates, target } = data;
  const trace = getResidentTrace(coordinates);

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
