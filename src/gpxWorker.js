// GPS Processing Web Worker
// This runs GPS computations off the main thread to prevent UI freezing
// All Trace handles must be manually freed with .free() to prevent memory leaks

import init, { buildTrace, parseGpxAll } from "@totorototo/navigo/web";

// Initialize navigo/WASM in worker context
let isInitialized = false;

async function initializeNavigo() {
  if (!isInitialized) {
    await init();
    isInitialized = true;
  }
}

const M_PER_KM = 1000;

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
 * Build navigo's weather option array from a forecast map keyed by checkpoint
 * name. The values are converted from the store's forecast shape
 * ({ temp, humidity, wind, precipitation }) to navigo's `analyze()` option
 * shape ({ name, temperatureC, humidityPct, windKmh, precipProbPct }).
 *
 * Returns an empty array when no forecasts are provided, so the estimate is
 * unchanged. Entries missing a field fall back to neutral-ish defaults that
 * contribute no penalty (cool, dry, calm, average humidity).
 */
function buildWeatherOptions(weatherByCheckpoint) {
  if (!weatherByCheckpoint) return [];
  const entries = [];
  for (const [name, f] of Object.entries(weatherByCheckpoint)) {
    if (!f) continue;
    entries.push({
      name,
      temperatureC: Number.isFinite(f.temp) ? f.temp : 12.0,
      humidityPct: Number.isFinite(f.humidity) ? f.humidity : 50.0,
      windKmh: Number.isFinite(f.wind) ? f.wind : 0.0,
      precipProbPct: Number.isFinite(f.precipitation) ? f.precipitation : 0.0,
    });
  }
  return entries;
}

// ── navigo Trace adapter ───────────────────────────────────────────────────────
// navigo's Trace reports distances in kilometers; the rest of this worker
// (and the store/hooks/components downstream) expects meters, the unit Zig
// used to produce. These helpers translate at this one boundary so nothing
// downstream needs to change.

function toLatLonEle(navPoint) {
  return [navPoint.latitude, navPoint.longitude, navPoint.altitude];
}

// navigo arrays are flat [lon, lat, alt, ...]; this app's convention is
// [lat, lon, ele] triples.
function flatLonLatAltToPoints(flat) {
  const count = flat.length / 3;
  const points = new Array(count);
  for (let i = 0; i < count; i++) {
    points[i] = [flat[i * 3 + 1], flat[i * 3], flat[i * 3 + 2]];
  }
  return points;
}

function emptyTraceAdapter() {
  return {
    points: [],
    cumulativeDistances: [],
    cumulativeElevations: [],
    cumulativeElevationLoss: [],
    slopes: [],
    peaks: [],
    valleys: [],
    totalDistance: 0,
    totalElevation: 0,
    totalElevationLoss: 0,
    findIndexAtDistance: () => 0,
    pointAtDistance: () => null,
    sliceBetweenDistances: () => null,
    findClosestPoint: () => null,
    deinit: () => {},
  };
}

// Wraps a navigo Trace built from raw [lat, lon, ele] coordinates (no GPX
// waypoints) behind the camelCase/meter API this file used with Zig's Trace.
function wrapCoordinatesTrace(coordinatesLatLonEle) {
  const n = coordinatesLatLonEle.length;
  const flat = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [lat, lon, ele] = coordinatesLatLonEle[i];
    flat[i * 3] = lon;
    flat[i * 3 + 1] = lat;
    flat[i * 3 + 2] = ele;
  }

  const navTrace = buildTrace(flat);
  if (!navTrace) return emptyTraceAdapter();

  let cachedPoints = null;

  return {
    get points() {
      if (!cachedPoints) {
        cachedPoints = flatLonLatAltToPoints(navTrace.getLocationsFlat());
      }
      return cachedPoints;
    },
    get cumulativeDistances() {
      return Array.from(
        navTrace.getCumulativeDistances(),
        (km) => km * M_PER_KM,
      );
    },
    get cumulativeElevations() {
      return Array.from(navTrace.getCumulativeElevationGains());
    },
    get cumulativeElevationLoss() {
      return Array.from(navTrace.getCumulativeElevationLosses());
    },
    get slopes() {
      return Array.from(navTrace.getSlopes());
    },
    get peaks() {
      return Array.from(navTrace.getPeaks());
    },
    get valleys() {
      return Array.from(navTrace.getValleys());
    },
    get totalDistance() {
      return navTrace.totalDistance * M_PER_KM;
    },
    get totalElevation() {
      return navTrace.totalElevationGain;
    },
    get totalElevationLoss() {
      return navTrace.totalElevationLoss;
    },
    findIndexAtDistance(meters) {
      return navTrace.indexAtDistance(meters / M_PER_KM);
    },
    pointAtDistance(meters) {
      const p = navTrace.pointAtDistance(meters / M_PER_KM);
      return p ? toLatLonEle(p) : null;
    },
    sliceBetweenDistances(startMeters, endMeters) {
      const flatSlice = navTrace.sliceBetweenDistances(
        startMeters / M_PER_KM,
        endMeters / M_PER_KM,
      );
      return flatSlice ? flatLonLatAltToPoints(flatSlice) : null;
    },
    findClosestPoint(targetLatLonEle) {
      const [lat, lon, ele] = targetLatLonEle;
      const result = navTrace.findClosestPoint(lon, lat, ele);
      if (!result) return null;
      return {
        point: toLatLonEle(result.location),
        index: result.index,
        distance: result.distance * M_PER_KM,
      };
    },
    deinit() {
      navTrace.free();
    },
  };
}

// ── Leg/section/stage/climb/waypoint sanitizers ───────────────────────────────
// navigo's analyze() output is camelCase/km; map each to the exact
// camelCase/meter shape the store and hooks already consume.

function toLeg(l, points) {
  const startLocation = l.startLocation;
  const endLocation = l.endLocation;
  return {
    legId: l.legId,
    sectionIdx: l.sectionIdx,
    startIndex: l.startIndex,
    endIndex: l.endIndex,
    pointCount: l.endIndex - l.startIndex + 1,
    startPoint: points[l.startIndex] ?? null,
    endPoint: points[l.endIndex] ?? null,
    startLocation,
    endLocation,
    totalDistance: l.totalDistanceKm * M_PER_KM,
    totalElevation: l.totalElevationGainM,
    totalElevationLoss: l.totalElevationLossM,
    avgSlope: l.avgSlope,
    maxSlope: l.maxSlope,
    minElevation: l.minElevation,
    maxElevation: l.maxElevation,
    bearing: l.bearing,
    difficulty: l.difficulty,
    estimatedDuration: l.estimatedDurationS,
    segmentId: `leg-${l.sectionIdx}-${startLocation}-${endLocation}`,
  };
}

function toSection(s, points) {
  const startLocation = s.startLocation;
  const endLocation = s.endLocation;
  return {
    sectionId: `section-${s.stageIdx}-${startLocation}-${endLocation}`,
    stageIdx: s.stageIdx,
    startIndex: s.startIndex,
    endIndex: s.endIndex,
    pointCount: s.endIndex - s.startIndex + 1,
    startPoint: points[s.startIndex] ?? null,
    endPoint: points[s.endIndex] ?? null,
    startLocation,
    endLocation,
    totalDistance: s.totalDistanceKm * M_PER_KM,
    totalElevation: s.totalElevationGainM,
    totalElevationLoss: s.totalElevationLossM,
    avgSlope: s.avgSlope,
    maxSlope: s.maxSlope,
    minElevation: s.minElevation,
    maxElevation: s.maxElevation,
    startTime: s.startTime != null ? Number(s.startTime) : null,
    endTime: s.endTime != null ? Number(s.endTime) : null,
    bearing: s.bearing,
    difficulty: s.difficulty,
    estimatedDuration: s.estimatedDurationS,
    paceFactor: s.paceFactor,
    maxCompletionTime:
      s.maxCompletionTime != null ? Number(s.maxCompletionTime) : null,
    cutoffRatio: s.cutoffRatio ?? null,
    stopDuration: s.stopDuration ?? null,
  };
}

function toStage(s, points) {
  const startLocation = s.startLocation;
  const endLocation = s.endLocation;
  return {
    stageId: `stage-${startLocation}-${endLocation}`,
    startIndex: s.startIndex,
    endIndex: s.endIndex,
    pointCount: s.endIndex - s.startIndex + 1,
    startPoint: points[s.startIndex] ?? null,
    endPoint: points[s.endIndex] ?? null,
    startLocation,
    endLocation,
    totalDistance: s.totalDistanceKm * M_PER_KM,
    totalElevation: s.totalElevationGainM,
    totalElevationLoss: s.totalElevationLossM,
    avgSlope: s.avgSlope,
    maxSlope: s.maxSlope,
    minElevation: s.minElevation,
    maxElevation: s.maxElevation,
    startTime: s.startTime != null ? Number(s.startTime) : null,
    endTime: s.endTime != null ? Number(s.endTime) : null,
    bearing: s.bearing,
    difficulty: s.difficulty,
    estimatedDuration: s.estimatedDurationS,
    paceFactor: s.paceFactor,
    maxCompletionTime:
      s.maxCompletionTime != null ? Number(s.maxCompletionTime) : null,
    cutoffRatio: s.cutoffRatio ?? null,
    stopDuration: s.stopDuration ?? null,
  };
}

// navigo's waypoint DTO doesn't expose description/comment/symbol — only
// `name` and `wptType` are read downstream (see utils/coordinateTransforms.js),
// so desc/cmt/sym stay null until navigo's WASM bindings add them.
function toWaypoint(w) {
  return {
    lat: w.latitude,
    lon: w.longitude,
    ele: w.elevation ?? null,
    name: w.name,
    desc: null,
    cmt: null,
    sym: null,
    wptType: w.wptType ?? null,
    time: w.time != null ? Number(w.time) : null,
  };
}

function toClimb(c) {
  return {
    startIndex: Number(c.startIndex),
    endIndex: Number(c.endIndex),
    startDistM: c.startDistKm * M_PER_KM,
    climbDistM: c.climbDistKm * M_PER_KM,
    elevationGain: c.elevationGain,
    summitElev: c.summitElev,
    avgGradient: c.avgGradient,
  };
}

// `null` when the route has fewer than two boundaries of that kind — the
// hooks downstream already treat null as "fall back to the a-priori model."
function toRecalibration(r) {
  if (!r) return null;
  return {
    calibrationFactor: r.calibrationFactor,
    calibratedBasePaceSPerKm: r.calibratedBasePaceSPerKm,
    predictedSoFarS: r.predictedSoFarS,
    actualElapsedS: r.actualElapsedS,
    etas: r.etas.map((e) => ({
      id: e.id,
      endIndex: e.endIndex,
      remainingDurationS: e.remainingDurationS,
      cumulativeRemainingS: e.cumulativeRemainingS,
    })),
  };
}

// Message handler for communication with main thread
self.onmessage = async function (e) {
  const { type, data, id } = e.data;

  try {
    await initializeNavigo();

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

  const options = {
    basePaceSPerKm,
    kFatigue,
    lifeBaseStopS,
    weather: buildWeatherOptions(weatherByCheckpoint),
  };

  const trace = parseGpxAll(new Uint8Array(gpxFileBytes.gpxBytes));
  if (!trace) {
    throw new Error("GPX file contains no valid track points");
  }

  const analysis = trace.analyze(options) ?? {};

  // Full-resolution route coordinates, [lat, lon, ele] triples — used both for
  // the map (flattened below) and to derive leg/section/stage start/end points.
  const points = flatLonLatAltToPoints(trace.getLocationsFlat());

  const sanitizedLegs = (analysis.legs ?? []).map((l) => toLeg(l, points));
  const sanitizedSections = (analysis.sections ?? []).map((s) =>
    toSection(s, points),
  );
  const sanitizedStages = (analysis.stages ?? []).map((s) =>
    toStage(s, points),
  );
  const sanitizedWaypoints = (analysis.waypoints ?? []).map(toWaypoint);

  const metadata = {
    name: analysis.metadata?.name ?? null,
    description: analysis.metadata?.description ?? null,
  };

  // Full-resolution route coordinates for the map, kept in [lat, lon, ele]
  // order (stride 3) so the worker just flattens with no per-point swap; the
  // map swaps to [lng, lat] at read time. A flat Float64Array is compact and
  // transferable, so the store never holds the raw XML string.
  const pointCount = points.length;
  const routeLatLonEle = new Float64Array(pointCount * 3);
  for (let i = 0; i < pointCount; i++) {
    const p = points[i];
    routeLatLonEle[i * 3] = p[0]; // lat
    routeLatLonEle[i * 3 + 1] = p[1]; // lon
    routeLatLonEle[i * 3 + 2] = p[2]; // ele
  }

  const sanitizedClimbs = (trace.climbs() ?? []).map(toClimb);

  const traceResult = {
    points,
    slopes: Array.from(trace.getSlopes()),
    cumulativeDistances: Array.from(
      trace.getCumulativeDistances(),
      (km) => km * M_PER_KM,
    ),
    cumulativeElevations: Array.from(trace.getCumulativeElevationGains()),
    cumulativeElevationLoss: Array.from(trace.getCumulativeElevationLosses()),
    peaks: Array.from(trace.getPeaks()),
    valleys: Array.from(trace.getValleys()),
    totalDistance: trace.totalDistance * M_PER_KM,
    totalElevation: trace.totalElevationGain,
    totalElevationLoss: trace.totalElevationLoss,
  };

  const results = {
    metadata,
    trace: traceResult,
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

  trace.free();
}

async function processGPSData(gpsData, requestId) {
  markStart("processGPSData");
  const trace = wrapCoordinatesTrace(gpsData.coordinates);

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

  const results = {
    points: trace.points,
    slopes: trace.slopes,
    cumulativeDistances: trace.cumulativeDistances,
    cumulativeElevations: trace.cumulativeElevations,
    cumulativeElevationLoss: trace.cumulativeElevationLoss,
    peaks: trace.peaks,
    valleys: trace.valleys,
    totalDistance: trace.totalDistance,
    totalElevation: trace.totalElevation,
    totalElevationLoss: trace.totalElevationLoss,
  };

  markEnd("processGPSData");

  self.postMessage({
    type: "GPS_DATA_PROCESSED",
    id: requestId,
    results,
    timingMs: { gpsProcess: measureMs("processGPSData") },
  });

  trace.deinit();
}

async function processSections(data, requestId) {
  markStart("processSections");
  const { coordinates, sections } = data;

  // Validate coordinates before creating trace
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    throw new Error("Invalid coordinates data");
  }

  const trace = wrapCoordinatesTrace(coordinates);

  // Send progress updates during processing
  self.postMessage({
    type: "PROGRESS",
    id: requestId,
    progress: 25,
    message: "Trace initialized...",
  });

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

      // Only extract points if needed (causes WASM → JS copy)
      for (let i = startIndex; i <= endIndex; i++) {
        sectionPoints.push([
          trace.points[i][0],
          trace.points[i][1],
          trace.points[i][2],
        ]);
      }
    }

    const startPoint = trace.pointAtDistance(startKm * 1000);
    const endPoint = trace.pointAtDistance(endKm * 1000);

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

  trace.deinit();
}

// Calculate route statistics (moderate computation)
async function calculateRouteStats(data, requestId) {
  const { coordinates, segments } = data;
  const trace = wrapCoordinatesTrace(coordinates);
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
      startPoint: startPoint
        ? [startPoint[0], startPoint[1], startPoint[2]]
        : null,
      endPoint: endPoint ? [endPoint[0], endPoint[1], endPoint[2]] : null,
    };
  });

  trace.deinit();

  self.postMessage({
    type: "ROUTE_STATS_CALCULATED",
    id: requestId,
    stats,
  });
}

// Find multiple points at specified distances (light computation)
async function findPointsAtDistances(data, requestId) {
  const { coordinates, distances } = data;
  const trace = wrapCoordinatesTrace(coordinates);

  const points = distances
    .map((distance) => {
      const point = trace.pointAtDistance(distance);
      return {
        distance,
        point: point ? [point[0], point[1], point[2]] : null,
      };
    })
    .filter((item) => item.point !== null);

  trace.deinit();

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

  const trace = wrapCoordinatesTrace(section);

  self.postMessage({
    type: "ROUTE_SECTION_READY",
    id: requestId,
    section: {
      totalDistance: trace.totalDistance,
      totalElevation: trace.totalElevation,
      totalElevationLoss: trace.totalElevationLoss,
    },
  });

  trace.deinit();
}

// Recalibrate section and stage ETAs against the runner's current position.
// Re-parses the GPX bytes (already in hand from the initial load) to get a
// fresh Trace with waypoints, then asks navigo to solve a calibration factor
// from real vs. predicted elapsed time and re-predict the remaining
// section/stage intervals. Downstream (recalLookup.js, useCheckpointETAs,
// useStageETAs) already treats a null section/stage as "fall back to the
// a-priori pace model" — that path still applies whenever navigo returns
// null (fewer than two boundaries of that kind).
async function recalibrate(data, requestId) {
  markStart("recalibrate");

  const {
    gpxBytes,
    currentIndex,
    actualElapsedS,
    basePaceSPerKm = 500.0,
    kFatigue = 0.002,
    lifeBaseStopS = 3600,
    weatherByCheckpoint = null,
  } = data;

  const options = {
    basePaceSPerKm,
    kFatigue,
    lifeBaseStopS,
    currentIndex,
    actualElapsedS,
    weather: buildWeatherOptions(weatherByCheckpoint),
  };

  const trace = parseGpxAll(new Uint8Array(gpxBytes));
  let recalibration = { section: null, stage: null };

  if (trace) {
    const result = trace.recalibrate(options);
    recalibration = {
      section: toRecalibration(result?.sections ?? null),
      stage: toRecalibration(result?.stages ?? null),
    };
    trace.free();
  }

  markEnd("recalibrate");

  self.postMessage({
    type: "RECALIBRATED",
    id: requestId,
    results: { recalibration },
    timingMs: { recalibrate: measureMs("recalibrate") },
  });
}

// Find closest point to target location
async function findClosestLocation(data, requestId) {
  const { coordinates, target } = data;
  const trace = wrapCoordinatesTrace(coordinates);

  const closest = trace.findClosestPoint(target);

  trace.deinit();

  self.postMessage({
    type: "CLOSEST_POINT_FOUND",
    id: requestId,
    closestLocation: closest.point
      ? [closest.point[0], closest.point[1], closest.point[2]]
      : null,
    closestIndex: closest.index,
    deviationDistance: closest.distance ?? 0,
  });
}
