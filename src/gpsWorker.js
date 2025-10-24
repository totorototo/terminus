// GPS Processing Web Worker
// This runs GPS computations off the main thread to prevent UI freezing

import { Trace, __zigar } from "../zig/trace.zig";

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

// Process full GPS data (heavy computation)
async function processGPSData(gpsData, requestId) {
  console.log("🔄 GPS Worker: Processing GPS data...");

  const trace = Trace.init(gpsData.coordinates);

  // Send progress updates during processing
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

  trace.deinit();

  self.postMessage({
    type: "GPS_DATA_PROCESSED",
    id: requestId,
    results: trace.valueOf(),
  });
}

async function processSections(data, requestId) {
  console.log("🔄 GPS Worker: Processing sections...");

  const { coordinates, sections } = data;
  const trace = Trace.init(coordinates);

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

    const sectionData = trace.sliceBetweenDistances(
      startKm * 1000,
      endKm * 1000,
    );

    const startPoint = trace.pointAtDistance(startKm * 1000);
    const endPoint = trace.pointAtDistance(endKm * 1000);

    const startIndex = trace.findIndexAtDistance(startKm * 1000);
    const endIndex = trace.findIndexAtDistance(endKm * 1000);

    // Create a new trace from the section data if needed
    const sectionTrace = Trace.init(sectionData);

    return {
      segmentId: section.id,
      pointCount: sectionData ? Number(sectionData.length) : 0,
      startKm: startKm,
      endKm: endKm,
      points: sectionTrace.points.valueOf(),
      startPoint: startPoint.valueOf(),
      endPoint: endPoint.valueOf(),
      startLocation: startLocation,
      endLocation: endLocation,
      totalDistance: sectionTrace.totalDistance,
      totalElevation: sectionTrace.totalElevation,
      totalElevationLoss: sectionTrace.totalElevationLoss,
      startIndex,
      endIndex,
    };
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

  const stats = segments.map((segment) => {
    const startDist = segment.start;
    const endDist = segment.end;
    const sectionPoints = trace.sliceBetweenDistances(startDist, endDist);
    const startPoint = trace.pointAtDistance(startDist);
    const endPoint = trace.pointAtDistance(endDist);

    return {
      segmentId: segment.id,
      distance: Number(endDist - startDist),
      pointCount: Number(sectionPoints.length),
      startPoint: startPoint ? startPoint.valueOf() : null,
      endPoint: endPoint ? endPoint.valueOf() : null,
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
        distance: Number(distance),
        point: point ? point.valueOf() : null,
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

// find closest point to target
async function findClosestLocation(data, requestId) {
  const { coordinates, target } = data;
  const trace = Trace.init(coordinates);

  const closest = trace.findClosestPoint(target);

  const closestLocation = closest.point ? closest.point.valueOf() : null;

  const closestIndex = closest.index;

  trace.deinit();

  self.postMessage({
    type: "CLOSEST_POINT_FOUND",
    id: requestId,
    closestLocation,
    closestIndex,
  });
}

console.log("🚀 GPS Worker: Ready for GPS processing tasks");
