const std = @import("std");
const math = std.math;

// Define your indices for clarity
pub const IDX_LON = 0;
pub const IDX_LAT = 1;
pub const IDX_ELEV = 2;

/// Print a [3]f64 point
pub fn printPoint(pt: [3]f64) void {
    std.debug.print("Longitude: {}, Latitude: {}, Elevation: {}\n", .{ pt[IDX_LON], pt[IDX_LAT], pt[IDX_ELEV] });
}

/// Compute haversine distance between two [3]f64 points (ignoring elevation)
pub fn distance(a: [3]f64, b: [3]f64) f64 {
    const R = 6371000.0; // meters
    const lat1 = math.degreesToRadians(a[IDX_LAT]);
    const lon1 = math.degreesToRadians(a[IDX_LON]);
    const lat2 = math.degreesToRadians(b[IDX_LAT]);
    const lon2 = math.degreesToRadians(b[IDX_LON]);
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const sinDLat = math.sin(dLat / 2.0);
    const sinDLon = math.sin(dLon / 2.0);
    const a_ = sinDLat * sinDLat +
        math.cos(lat1) * math.cos(lat2) * sinDLon * sinDLon;
    const c = 2.0 * math.atan2(math.sqrt(a_), math.sqrt(1.0 - a_));
    return R * c;
}

/// Compute 3D distance between two [3]f64 points (haversine + elevation)
pub fn distance3D(a: [3]f64, b: [3]f64) f64 {
    const horizontal = distance(a, b);
    const elev_delta = b[IDX_ELEV] - a[IDX_ELEV];
    return math.sqrt(horizontal * horizontal + elev_delta * elev_delta);
}

/// Elevation difference (absolute value)
pub fn elevationDelta(a: [3]f64, b: [3]f64) f64 {
    const delta = a[IDX_ELEV] - b[IDX_ELEV];
    return if (delta >= 0) delta else -delta;
}

/// Initial bearing from a to b
pub fn bearingTo(a: [3]f64, b: [3]f64) f64 {
    const lat1 = math.degreesToRadians(a[IDX_LAT]);
    const lon1 = math.degreesToRadians(a[IDX_LON]);
    const lat2 = math.degreesToRadians(b[IDX_LAT]);
    const lon2 = math.degreesToRadians(b[IDX_LON]);
    const dLon = lon2 - lon1;
    const y = math.sin(dLon) * math.cos(lat2);
    const x = math.cos(lat1) * math.sin(lat2) -
        math.sin(lat1) * math.cos(lat2) * math.cos(dLon);
    var bearing = math.atan2(y, x);
    bearing = math.radiansToDegrees(bearing);
    if (bearing < 0.0) bearing += 360.0;
    return bearing;
}

/// Absolute elevation difference (already present)
pub fn elevationDeltaAbs(a: [3]f64, b: [3]f64) f64 {
    const delta = a[IDX_ELEV] - b[IDX_ELEV];
    return if (delta >= 0) delta else -delta;
}

/// Signed elevation difference (b - a)
pub fn elevationDeltaSigned(a: [3]f64, b: [3]f64) f64 {
    return b[IDX_ELEV] - a[IDX_ELEV];
}
