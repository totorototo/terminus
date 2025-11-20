// GPS Processing Web Worker
// This runs GPS computations off the main thread to prevent UI freezing
// All Trace objects must be manually cleaned up with .deinit() to prevent memory leaks

import { Trace, __zigar } from "../zig/trace.zig";
import { readGPXComplete } from "../zig/gpx.zig";

// Initialize Zig/WASM in worker context
let isInitialized = false;

async function initializeZig() {
  if (!isInitialized) {
    const { init } = __zigar;
    await init();
    isInitialized = true;
    console.log("🔧 GPS Worker: Zig WASM initialized");
  }
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
  console.log("🔄 GPS Worker: Processing GPX file...");
  const gpxData = readGPXComplete(gpxFileBytes.gpxBytes);

  console.log(
    `📊 Loaded ${gpxData.trace_points.length} track points, ${gpxData.waypoints.length} waypoints`,
  );

  // Create trace from the parsed GPX data
  const trace = Trace.init(gpxData.trace_points);
  console.log(`📊 After processing: ${trace.points.length} points in trace`);

  self.postMessage({
    type: "GPX_FILE_PROCESSED",
    id: requestId,
    results: {
      trace,
      waypoints: gpxData.waypoints,
      sections: gpxData.sections,
    },
  });

  trace.deinit();
  gpxData.deinit();
}

async function processGPSData(gpsData, requestId) {
  console.log("🔄 GPS Worker: Processing GPS data...");
  console.log(`📊 Input: ${gpsData.coordinates.length} GPS points`);

  const trace = Trace.init(gpsData.coordinates);

  console.log(`📊 After processing: ${trace.points.length} points in trace`);
  if (gpsData.coordinates.length > trace.points.length) {
    const reduction_pct = (
      (1.0 - trace.points.length / gpsData.coordinates.length) *
      100
    ).toFixed(1);
    console.log(
      `✂️ Simplified: ${gpsData.coordinates.length} → ${trace.points.length} points (${reduction_pct}% reduction)`,
    );
  }

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

  // Convert to plain JS object before deinit
  const results = trace.valueOf();
  trace.deinit();

  self.postMessage({
    type: "GPS_DATA_PROCESSED",
    id: requestId,
    results,
  });
}

async function processSections(data, requestId) {
  console.log("🔄 GPS Worker: Processing sections...");

  const { coordinates, sections } = data;

  // Validate coordinates before creating trace
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    throw new Error("Invalid coordinates data");
  }

  const trace = Trace.init(coordinates);

  console.log(
    `📏 Trace total distance: ${trace.totalDistance}m (${(trace.totalDistance / 1000).toFixed(2)}km)`,
  );
  console.log(`📏 Trace points: ${trace.points.length}`);
  console.log(`📍 Processing ${sections.length} sections`);

  // Send progress updates during processing
  self.postMessage({
    type: "PROGRESS",
    id: requestId,
    progress: 25,
    message: "Trace initialized...",
  });

  const results = sections.map((section, idx) => {
    const {
      startKm,
      endKm,
      startCheckpoint: { location: startLocation },
      endCheckpoint: { location: endLocation },
    } = section;

    console.log(`🔍 Section ${idx}: startKm=${startKm}, endKm=${endKm}`);

    // Ensure valid km range and clamp to trace bounds
    const validStartKm = Math.max(0, startKm);
    const validEndKm = Math.max(validStartKm, endKm);
    const maxDistanceKm = trace.totalDistance / 1000;
    const clampedStartKm = Math.min(validStartKm, maxDistanceKm);
    const clampedEndKm = Math.min(validEndKm, maxDistanceKm);

    const startMeters = clampedStartKm * 1000;
    const endMeters = clampedEndKm * 1000;

    console.log(`✅ Clamped to: ${startMeters}m - ${endMeters}m`);

    let sectionData = null;
    let startPoint = null;
    let endPoint = null;
    let startIndex = 0;
    let endIndex = 0;

    try {
      sectionData = trace.sliceBetweenDistances(startMeters, endMeters);
      startPoint = trace.pointAtDistance(startMeters);
      endPoint = trace.pointAtDistance(endMeters);
      startIndex = trace.findIndexAtDistance(startMeters);
      endIndex = trace.findIndexAtDistance(endMeters);
    } catch (e) {
      console.error(`⚠️ Error calling trace methods for section ${idx}:`, e);
      console.error(`  startMeters: ${startMeters}, endMeters: ${endMeters}`);
    }

    // Extract points directly from the slice without creating a new trace
    // This avoids the memory management issues with sub-traces
    let sectionPoints = [];
    let pointCount = 0;

    if (sectionData) {
      try {
        // Get the slice as a plain JS array immediately
        const sliceArray = Array.from(sectionData);
        if (sliceArray && sliceArray.length > 0) {
          sectionPoints = sliceArray.map((point) => Array.from(point));
          pointCount = sectionPoints.length;
        }
      } catch (e) {
        console.error(
          `⚠️ Error extracting section points for section ${idx}:`,
          e,
        );
      }
    }

    // Calculate section statistics from the main trace using indices
    let sectionDistance = 0;
    let sectionElevation = 0;
    let sectionElevationLoss = 0;

    if (startIndex < endIndex && endIndex < trace.cumulativeDistances.length) {
      try {
        sectionDistance =
          trace.cumulativeDistances[endIndex] -
          trace.cumulativeDistances[startIndex];
        sectionElevation =
          trace.cumulativeElevations[endIndex] -
          trace.cumulativeElevations[startIndex];
        sectionElevationLoss =
          trace.cumulativeElevationLoss[endIndex] -
          trace.cumulativeElevationLoss[startIndex];
      } catch (e) {
        console.error(
          `⚠️ Error calculating section stats for section ${idx}:`,
          e,
        );
      }
    }

    // Extract data before cleanup
    const result = {
      segmentId: section.id,
      pointCount,
      startKm,
      endKm,
      points: sectionPoints,
      startPoint: startPoint?.valueOf() ?? null,
      endPoint: endPoint?.valueOf() ?? null,
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

  self.postMessage({
    type: "SECTIONS_PROCESSED",
    id: requestId,
    results,
  });

  trace.deinit();
}

// Calculate route statistics (moderate computation)
async function calculateRouteStats(data, requestId) {
  const { coordinates, segments } = data;
  const trace = Trace.init(coordinates);
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
      startPoint: startPoint?.valueOf() ?? null,
      endPoint: endPoint?.valueOf() ?? null,
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
  const trace = Trace.init(coordinates);

  const points = distances
    .map((distance) => {
      const point = trace.pointAtDistance(distance);
      return {
        distance,
        point: point?.valueOf() ?? null,
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
  const section = coordinates.slice(start, end); // Copy to avoid modifying original

  const trace = Trace.init(section);

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

// Find closest point to target location
async function findClosestLocation(data, requestId) {
  const { coordinates, target } = data;
  const trace = Trace.init(coordinates);

  const closest = trace.findClosestPoint(target);

  trace.deinit();

  self.postMessage({
    type: "CLOSEST_POINT_FOUND",
    id: requestId,
    closestLocation: closest.point?.valueOf() ?? null,
    closestIndex: closest.index,
  });
}

console.log("🚀 GPS Worker: Ready for GPS processing tasks");
