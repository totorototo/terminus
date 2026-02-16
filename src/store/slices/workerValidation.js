// Validation helpers for worker response data
// Exported from a separate module for testability and reuse

export function validateArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${name} to be an array, got ${typeof value}`);
  }
  return value;
}

export function validateObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Expected ${name} to be an object, got ${typeof value}`);
  }
  return value;
}

export function validateNumber(value, name) {
  if (typeof value !== "number") {
    throw new Error(`Expected ${name} to be a number, got ${typeof value}`);
  }
  return value;
}

export function validateGPXResults(results) {
  if (!results) throw new Error("No results returned from worker");

  const trace = validateObject(results.trace, "results.trace");
  validateArray(trace.points, "trace.points");
  validateArray(trace.peaks, "trace.peaks");
  validateArray(trace.slopes, "trace.slopes");
  validateArray(trace.cumulativeDistances, "trace.cumulativeDistances");
  validateArray(trace.cumulativeElevations, "trace.cumulativeElevations");
  validateArray(trace.cumulativeElevationLoss, "trace.cumulativeElevationLoss");

  validateNumber(trace.totalDistance, "trace.totalDistance");
  validateNumber(trace.totalElevation, "trace.totalElevation");
  validateNumber(trace.totalElevationLoss, "trace.totalElevationLoss");

  validateArray(results.sections, "results.sections");
  validateArray(results.waypoints, "results.waypoints");
  validateObject(results.metadata, "results.metadata");

  return true;
}

export function validateGPSDataResults(results) {
  if (!results) throw new Error("No results returned from worker");

  validateArray(results.points, "results.points");
  validateArray(results.slopes, "results.slopes");
  validateArray(results.cumulativeDistances, "results.cumulativeDistances");
  validateArray(results.cumulativeElevations, "results.cumulativeElevations");
  validateArray(
    results.cumulativeElevationLoss,
    "results.cumulativeElevationLoss",
  );

  validateNumber(results.totalDistance, "results.totalDistance");
  validateNumber(results.totalElevation, "results.totalElevation");
  validateNumber(results.totalElevationLoss, "results.totalElevationLoss");
  validateNumber(results.pointCount, "results.pointCount");

  return true;
}

export function validateSectionsResults(results) {
  if (!results) throw new Error("No results returned from worker");

  // Results is an array with summary properties attached
  validateArray(results, "results");
  validateNumber(results.totalDistance, "results.totalDistance");
  validateNumber(results.totalElevationGain, "results.totalElevationGain");
  validateNumber(results.totalElevationLoss, "results.totalElevationLoss");
  validateNumber(results.pointCount, "results.pointCount");

  return true;
}

export function validateRouteStatsResults(results) {
  if (!results) throw new Error("No results returned from worker");

  validateNumber(results.distance, "results.distance");
  validateNumber(results.elevationGain, "results.elevationGain");
  validateNumber(results.elevationLoss, "results.elevationLoss");
  validateNumber(results.pointCount, "results.pointCount");

  return true;
}

export function validatePointsAtDistancesResults(results) {
  if (!results) throw new Error("No results returned from worker");

  validateObject(results, "results");
  validateArray(results.points, "results.points");

  return true;
}

export function validateRouteSectionResults(results) {
  if (!results) throw new Error("No results returned from worker");

  validateObject(results, "results");
  validateArray(results.section, "results.section");
  // distance is optional but must be a number if provided
  if (results.distance !== undefined && typeof results.distance !== "number") {
    throw new Error(
      `Expected results.distance to be a number, got ${typeof results.distance}`,
    );
  }

  return true;
}
