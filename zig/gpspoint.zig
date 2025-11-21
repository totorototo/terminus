const std = @import("std");
const math = std.math;

// Define your indices for clarity
// Points are stored as [latitude, longitude, elevation]
pub const IDX_LAT = 0;
pub const IDX_LON = 1;
pub const IDX_ELEV = 2;

/// Print a [3]f64 point
pub fn printPoint(pt: [3]f64) void {
    std.debug.print("Latitude: {}, Longitude: {}, Elevation: {}\n", .{ pt[IDX_LAT], pt[IDX_LON], pt[IDX_ELEV] });
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

test "distance: same point returns zero" {
    const p = [3]f64{ 0.0, 0.0, 0.0 };
    const d = distance(p, p);
    try std.testing.expectApproxEqAbs(0.0, d, 0.001);
}

test "distance: equator 1 degree longitude" {
    const a = [3]f64{ 0.0, 0.0, 0.0 };
    const b = [3]f64{ 1.0, 0.0, 0.0 };
    const d = distance(a, b);
    // At equator, 1 degree longitude ≈ 111,320 meters
    try std.testing.expectApproxEqAbs(111320.0, d, 200.0);
}

test "distance: equator 1 degree latitude" {
    const a = [3]f64{ 0.0, 0.0, 0.0 };
    const b = [3]f64{ 0.0, 1.0, 0.0 };
    const d = distance(a, b);
    // 1 degree latitude ≈ 111,320 meters
    try std.testing.expectApproxEqAbs(111320.0, d, 200.0);
}

test "distance: known coordinates (Paris to London)" {
    const paris = [3]f64{ 48.8566, 2.3522, 0.0 };
    const london = [3]f64{ 51.5074, -0.1276, 0.0 };
    const d = distance(paris, london);
    // Actual distance is approximately 343,560 meters
    try std.testing.expectApproxEqAbs(343560.0, d, 1000.0);
}

test "distance3D: horizontal only (same elevation)" {
    const a = [3]f64{ 0.0, 0.0, 100.0 };
    const b = [3]f64{ 1.0, 0.0, 100.0 };
    const d2d = distance(a, b);
    const d3d = distance3D(a, b);
    try std.testing.expectApproxEqAbs(d2d, d3d, 0.001);
}

test "distance3D: vertical only (same location)" {
    const a = [3]f64{ 0.0, 0.0, 0.0 };
    const b = [3]f64{ 0.0, 0.0, 100.0 };
    const d3d = distance3D(a, b);
    try std.testing.expectApproxEqAbs(100.0, d3d, 0.001);
}

test "distance3D: pythagorean theorem (3-4-5 triangle)" {
    // Create points where horizontal distance is ~3000m and vertical is 4000m
    // Expected 3D distance: 5000m
    const a = [3]f64{ 0.0, 0.0, 0.0 };
    // At equator, ~0.027 degrees ≈ 3000 meters
    const b = [3]f64{ 0.027, 0.0, 4000.0 };
    const d3d = distance3D(a, b);
    try std.testing.expectApproxEqAbs(5000.0, d3d, 50.0);
}

test "elevationDelta: positive difference" {
    const a = [3]f64{ 0.0, 0.0, 100.0 };
    const b = [3]f64{ 0.0, 0.0, 50.0 };
    const delta = elevationDelta(a, b);
    try std.testing.expectEqual(50.0, delta);
}

test "elevationDelta: negative difference returns positive" {
    const a = [3]f64{ 0.0, 0.0, 50.0 };
    const b = [3]f64{ 0.0, 0.0, 100.0 };
    const delta = elevationDelta(a, b);
    try std.testing.expectEqual(50.0, delta);
}

test "elevationDelta: same elevation" {
    const a = [3]f64{ 0.0, 0.0, 100.0 };
    const b = [3]f64{ 0.0, 0.0, 100.0 };
    const delta = elevationDelta(a, b);
    try std.testing.expectEqual(0.0, delta);
}

test "elevationDeltaSigned: ascending" {
    const a = [3]f64{ 0.0, 0.0, 100.0 };
    const b = [3]f64{ 0.0, 0.0, 150.0 };
    const delta = elevationDeltaSigned(a, b);
    try std.testing.expectEqual(50.0, delta);
}

test "elevationDeltaSigned: descending" {
    const a = [3]f64{ 0.0, 0.0, 150.0 };
    const b = [3]f64{ 0.0, 0.0, 100.0 };
    const delta = elevationDeltaSigned(a, b);
    try std.testing.expectEqual(-50.0, delta);
}

test "bearingTo: north" {
    const a = [3]f64{ 45.0, 0.0, 0.0 };
    const b = [3]f64{ 46.0, 0.0, 0.0 };
    const bearing = bearingTo(a, b);
    try std.testing.expectApproxEqAbs(0.0, bearing, 0.1);
}

test "bearingTo: east" {
    const a = [3]f64{ 45.0, 0.0, 0.0 };
    const b = [3]f64{ 45.0, 1.0, 0.0 };
    const bearing = bearingTo(a, b);
    try std.testing.expectApproxEqAbs(90.0, bearing, 1.0);
}

test "bearingTo: south" {
    const a = [3]f64{ 45.0, 0.0, 0.0 };
    const b = [3]f64{ 44.0, 0.0, 0.0 };
    const bearing = bearingTo(a, b);
    try std.testing.expectApproxEqAbs(180.0, bearing, 0.1);
}

test "bearingTo: west" {
    const a = [3]f64{ 45.0, 0.0, 0.0 };
    const b = [3]f64{ 45.0, -1.0, 0.0 };
    const bearing = bearingTo(a, b);
    try std.testing.expectApproxEqAbs(270.0, bearing, 1.0);
}

test "elevationDeltaAbs: matches elevationDelta" {
    const a = [3]f64{ 0.0, 0.0, 100.0 };
    const b = [3]f64{ 0.0, 0.0, 50.0 };
    const delta1 = elevationDelta(a, b);
    const delta2 = elevationDeltaAbs(a, b);
    try std.testing.expectEqual(delta1, delta2);
}
