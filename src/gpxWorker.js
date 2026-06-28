// GPS Processing Web Worker
// This runs GPS computations off the main thread to prevent UI freezing
// All Trace handles must be manually freed with .free() to prevent memory leaks

import init, { buildTrace, parseGpx } from "@totorototo/navigo/web";

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
// navigo's Trace returns snake_case fields in kilometers; the rest of this
// worker (and the store/hooks/components downstream) expects the camelCase,
// meter-based shape Zig used to produce. These helpers translate at this one
// boundary so nothing downstream needs to change.

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
        cachedPoints = flatLonLatAltToPoints(navTrace.locations_flat);
      }
      return cachedPoints;
    },
    get cumulativeDistances() {
      return Array.from(navTrace.cumulative_distances, (km) => km * M_PER_KM);
    },
    get cumulativeElevations() {
      return Array.from(navTrace.cumulative_elevation_gains);
    },
    get cumulativeElevationLoss() {
      return Array.from(navTrace.cumulative_elevation_losses);
    },
    get slopes() {
      return Array.from(navTrace.slopes);
    },
    get peaks() {
      return Array.from(navTrace.peaks);
    },
    get valleys() {
      return Array.from(navTrace.valleys);
    },
    get totalDistance() {
      return navTrace.total_distance * M_PER_KM;
    },
    get totalElevation() {
      return navTrace.total_elevation_gain;
    },
    get totalElevationLoss() {
      return navTrace.total_elevation_loss;
    },
    findIndexAtDistance(meters) {
      return navTrace.index_at_distance(meters / M_PER_KM);
    },
    pointAtDistance(meters) {
      const p = navTrace.point_at_distance(meters / M_PER_KM);
      return p ? toLatLonEle(p) : null;
    },
    sliceBetweenDistances(startMeters, endMeters) {
      const flatSlice = navTrace.slice_between_distances(
        startMeters / M_PER_KM,
        endMeters / M_PER_KM,
      );
      return flatSlice ? flatLonLatAltToPoints(flatSlice) : null;
    },
    findClosestPoint(targetLatLonEle) {
      const [lat, lon, ele] = targetLatLonEle;
      const result = navTrace.find_closest_point(lon, lat, ele);
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
// navigo's analyze() output is snake_case/km; map each to the exact
// camelCase/meter shape the store and hooks already consume.

function toLeg(l, points) {
  const startLocation = l.start_location;
  const endLocation = l.end_location;
  return {
    legId: l.leg_id,
    sectionIdx: l.section_idx,
    startIndex: l.start_index,
    endIndex: l.end_index,
    pointCount: l.end_index - l.start_index + 1,
    startPoint: points[l.start_index] ?? null,
    endPoint: points[l.end_index] ?? null,
    startLocation,
    endLocation,
    totalDistance: l.total_distance_km * M_PER_KM,
    totalElevation: l.total_elevation_gain_m,
    totalElevationLoss: l.total_elevation_loss_m,
    avgSlope: l.avg_slope,
    maxSlope: l.max_slope,
    minElevation: l.min_elevation,
    maxElevation: l.max_elevation,
    bearing: l.bearing,
    difficulty: l.difficulty,
    estimatedDuration: l.estimated_duration_s,
    segmentId: `leg-${l.section_idx}-${startLocation}-${endLocation}`,
  };
}

function toSection(s, points) {
  const startLocation = s.start_location;
  const endLocation = s.end_location;
  return {
    sectionId: `section-${s.stage_idx}-${startLocation}-${endLocation}`,
    stageIdx: s.stage_idx,
    startIndex: s.start_index,
    endIndex: s.end_index,
    pointCount: s.end_index - s.start_index + 1,
    startPoint: points[s.start_index] ?? null,
    endPoint: points[s.end_index] ?? null,
    startLocation,
    endLocation,
    totalDistance: s.total_distance_km * M_PER_KM,
    totalElevation: s.total_elevation_gain_m,
    totalElevationLoss: s.total_elevation_loss_m,
    avgSlope: s.avg_slope,
    maxSlope: s.max_slope,
    minElevation: s.min_elevation,
    maxElevation: s.max_elevation,
    startTime: s.start_time != null ? Number(s.start_time) : null,
    endTime: s.end_time != null ? Number(s.end_time) : null,
    bearing: s.bearing,
    difficulty: s.difficulty,
    estimatedDuration: s.estimated_duration_s,
    paceFactor: s.pace_factor,
    maxCompletionTime:
      s.max_completion_time != null ? Number(s.max_completion_time) : null,
    cutoffRatio: s.cutoff_ratio ?? null,
    stopDuration: s.stop_duration ?? null,
  };
}

function toStage(s, points) {
  const startLocation = s.start_location;
  const endLocation = s.end_location;
  return {
    stageId: `stage-${startLocation}-${endLocation}`,
    startIndex: s.start_index,
    endIndex: s.end_index,
    pointCount: s.end_index - s.start_index + 1,
    startPoint: points[s.start_index] ?? null,
    endPoint: points[s.end_index] ?? null,
    startLocation,
    endLocation,
    totalDistance: s.total_distance_km * M_PER_KM,
    totalElevation: s.total_elevation_gain_m,
    totalElevationLoss: s.total_elevation_loss_m,
    avgSlope: s.avg_slope,
    maxSlope: s.max_slope,
    minElevation: s.min_elevation,
    maxElevation: s.max_elevation,
    startTime: s.start_time != null ? Number(s.start_time) : null,
    endTime: s.end_time != null ? Number(s.end_time) : null,
    bearing: s.bearing,
    difficulty: s.difficulty,
    estimatedDuration: s.estimated_duration_s,
    paceFactor: s.pace_factor,
    maxCompletionTime:
      s.max_completion_time != null ? Number(s.max_completion_time) : null,
    cutoffRatio: s.cutoff_ratio ?? null,
    stopDuration: s.stop_duration ?? null,
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
    wptType: w.wpt_type ?? null,
    time: w.time != null ? Number(w.time) : null,
  };
}

function toClimb(c) {
  return {
    startIndex: Number(c.start_index),
    endIndex: Number(c.end_index),
    startDistM: c.start_dist_km * M_PER_KM,
    climbDistM: c.climb_dist_km * M_PER_KM,
    elevationGain: c.elevation_gain,
    summitElev: c.summit_elev,
    avgGradient: c.avg_gradient,
  };
}

// `null` when the route has fewer than two boundaries of that kind — the
// hooks downstream already treat null as "fall back to the a-priori model."
function toRecalibration(r) {
  if (!r) return null;
  return {
    calibrationFactor: r.calibration_factor,
    calibratedBasePaceSPerKm: r.calibrated_base_pace_s_per_km,
    predictedSoFarS: r.predicted_so_far_s,
    actualElapsedS: r.actual_elapsed_s,
    etas: r.etas.map((e) => ({
      id: e.id,
      endIndex: e.end_index,
      remainingDurationS: e.remaining_duration_s,
      cumulativeRemainingS: e.cumulative_remaining_s,
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

  const trace = parseGpx(new Uint8Array(gpxFileBytes.gpxBytes));
  if (!trace) {
    throw new Error("GPX file contains no valid track points");
  }

  const analysis = trace.analyze(options) ?? {};

  // Full-resolution route coordinates, [lat, lon, ele] triples — used both for
  // the map (flattened below) and to derive leg/section/stage start/end points.
  const points = flatLonLatAltToPoints(trace.locations_flat);

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
    slopes: Array.from(trace.slopes),
    cumulativeDistances: Array.from(
      trace.cumulative_distances,
      (km) => km * M_PER_KM,
    ),
    cumulativeElevations: Array.from(trace.cumulative_elevation_gains),
    cumulativeElevationLoss: Array.from(trace.cumulative_elevation_losses),
    peaks: Array.from(trace.peaks),
    valleys: Array.from(trace.valleys),
    totalDistance: trace.total_distance * M_PER_KM,
    totalElevation: trace.total_elevation_gain,
    totalElevationLoss: trace.total_elevation_loss,
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

  const trace = parseGpx(new Uint8Array(gpxBytes));
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
