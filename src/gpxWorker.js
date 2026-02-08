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
  const gpxData = await readGPXComplete(gpxFileBytes.gpxBytes);

  console.log(
    `📊 Loaded ${gpxData.trace.points.length} track points, ${gpxData.waypoints.length} waypoints`,
  );

  // Convert Zigar proxy objects to plain JS before sending
  // Note: Zig string fields ([]const u8) need .string property to convert to JS strings
  // Note: Zig i64 fields need explicit Number() conversion (they become BigInt in JS)
  let sanitizedSections = null;
  if (gpxData.sections) {
    sanitizedSections = [];
    for (let i = 0; i < gpxData.sections.length; i++) {
      const section = gpxData.sections[i];
      const sectionData = section.valueOf();
      sanitizedSections.push({
        ...sectionData,
        startLocation: section.startLocation.string,
        endLocation: section.endLocation.string,
        bearing: sectionData.bearing,
        startTime:
          sectionData.startTime !== null ? Number(sectionData.startTime) : null,
        endTime:
          sectionData.endTime !== null ? Number(sectionData.endTime) : null,
      });
    }
  }

  // Sanitize waypoints - convert BigInt time to Number
  const sanitizedWaypoints = [];
  for (let i = 0; i < gpxData.waypoints.length; i++) {
    const wpt = gpxData.waypoints[i];
    sanitizedWaypoints.push({
      lat: wpt.lat,
      lon: wpt.lon,
      name: wpt.name.string,
      time: wpt.time ? Number(wpt.time) : null, // Convert BigInt to Number
    });
  }

  const metadata = {
    name: gpxData.metadata.name ? gpxData.metadata.name.string : null,
    description: gpxData.metadata.description
      ? gpxData.metadata.description.string
      : null,
  };

  const results = {
    metadata,
    trace: gpxData.trace.valueOf(),
    waypoints: sanitizedWaypoints,
    sections: sanitizedSections,
    peaks: gpxData.peaks ? gpxData.peaks.map((p) => Number(p)) : [],
  };

  self.postMessage({
    type: "GPX_FILE_PROCESSED",
    id: requestId,
    results,
  });

  // gpxData.deinit() will now clean up the trace as well
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

  self.postMessage({
    type: "GPS_DATA_PROCESSED",
    id: requestId,
    results,
  });

  trace.deinit();
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
      // Better: keep points in WASM and only copy when necessary
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
      // Read directly from WASM instead of calling .valueOf()
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
  const trace = Trace.init(coordinates);

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
    // Read directly from WASM instead of calling .valueOf()
    closestLocation: closest.point
      ? [closest.point[0], closest.point[1], closest.point[2]]
      : null,
    closestIndex: closest.index,
  });
}

console.log("🚀 GPS Worker: Ready for GPS processing tasks");
