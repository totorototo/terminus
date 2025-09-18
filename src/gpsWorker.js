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

      case "CALCULATE_ROUTE_STATS":
        await calculateRouteStats(data, id);
        break;

      case "FIND_POINTS_AT_DISTANCES":
        await findPointsAtDistances(data, id);
        break;

      case "GET_ROUTE_SECTION":
        await getRouteSection(data, id);
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

  const updatedPoints = trace.data;
  const { get, length } = updatedPoints;
  const serializedPoints = Array.from({ length: length }, (_, i) => {
    const point = get(i);
    return [Number(point[0]), Number(point[1]), Number(point[2])]; // Ensure serializable
  });

  const peaks = trace.peaks;
  const { get: getPeak, length: peaksLength } = peaks;
  const serializedPeaks = Array.from({ length: peaksLength }, (_, i) => {
    const idx = getPeak(i);
    return Number(idx);
  });

  const results = {
    totalDistance: Number(trace.totalDistance()),
    totalElevation: Number(trace.totalElevation()),
    totalElevationLoss: Number(trace.totalElevationLoss()),
    pointCount: Number(gpsData.coordinates.length),
    points: serializedPoints,
    peaks: serializedPeaks,
  };

  self.postMessage({
    type: "PROGRESS",
    id: requestId,
    progress: 75,
    message: "Calculating statistics...",
  });

  // Add some sample points for visualization
  const sampleDistances = [0, 10, 25, 50, 75, 90]; // percentages
  const samplePoints = sampleDistances
    .map((percent) => {
      const distance = (results.totalDistance * percent) / 100;
      const point = trace.pointAtDistance(distance);

      // Convert Zig object to plain JavaScript array
      if (point !== null) {
        return {
          percent: Number(percent),
          distance: Number(distance),
          point: [Number(point[0]), Number(point[1]), Number(point[2])], // Ensure serializable
        };
      }
      return null;
    })
    .filter((item) => item !== null);

  results.samplePoints = samplePoints;

  trace.deinit();

  self.postMessage({
    type: "GPS_DATA_PROCESSED",
    id: requestId,
    results,
  });
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
      startPoint: startPoint
        ? [Number(startPoint[0]), Number(startPoint[1]), Number(startPoint[2])]
        : null,
      endPoint: endPoint
        ? [Number(endPoint[0]), Number(endPoint[1]), Number(endPoint[2])]
        : null,
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
        point: point
          ? [Number(point[0]), Number(point[1]), Number(point[2])]
          : null,
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
      totalDistance: Number(trace.totalDistance()),
      totalElevation: Number(trace.totalElevation()),
      totalElevationLoss: Number(trace.totalElevationLoss()),
    },
  });

  trace.deinit();
}

console.log("🚀 GPS Worker: Ready for GPS processing tasks");
