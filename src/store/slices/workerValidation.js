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
  validateArray(trace.valleys, "trace.valleys");
  validateArray(trace.slopes, "trace.slopes");
  validateArray(trace.cumulativeDistances, "trace.cumulativeDistances");
  validateArray(trace.cumulativeElevations, "trace.cumulativeElevations");
  validateArray(trace.cumulativeElevationLoss, "trace.cumulativeElevationLoss");

  validateNumber(trace.totalDistance, "trace.totalDistance");
  validateNumber(trace.totalElevation, "trace.totalElevation");
  validateNumber(trace.totalElevationLoss, "trace.totalElevationLoss");

  validateArray(results.legs, "results.legs");
  validateArray(results.sections, "results.sections");
  validateArray(results.stages, "results.stages");
  validateArray(results.waypoints, "results.waypoints");
  validateObject(results.metadata, "results.metadata");
  validateArray(results.climbs, "results.climbs");

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
  // distance is optional but must be a finite number if provided
  if (results.distance !== undefined && !Number.isFinite(results.distance)) {
    throw new Error(
      `Expected results.distance to be a finite number, got ${results.distance}`,
    );
  }

  return true;
}
