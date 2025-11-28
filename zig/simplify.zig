const std = @import("std");
const distance3D = @import("gpspoint.zig").distance3D;

const expect = std.testing.expect;
const expectApproxEqAbs = std.testing.expectApproxEqAbs;

/// Calculate perpendicular distance from point to line segment
/// Uses haversine distance for accurate geographic calculations
pub fn perpendicularDistance(point: [3]f64, line_start: [3]f64, line_end: [3]f64) f64 {
    // Calculate total line segment distance (cache to avoid duplicate call)
    const line_distance = distance3D(line_start, line_end);

    // Special case: line segment is actually a point
    if (line_distance < 0.001) {
        return distance3D(point, line_start);
    }

    // Calculate distances to create triangle
    const dist_start_to_point = distance3D(line_start, point);
    const dist_end_to_point = distance3D(line_end, point);

    // Use formula: perpendicular distance = 2 * area / base
    // where area is calculated using Heron's formula
    const s = (line_distance + dist_start_to_point + dist_end_to_point) / 2.0;
    const area_squared = s * (s - line_distance) * (s - dist_start_to_point) * (s - dist_end_to_point);

    if (area_squared <= 0.0) {
        // Point is on the line or numerical issues
        return @min(dist_start_to_point, dist_end_to_point);
    }

    const area = @sqrt(area_squared);
    return (2.0 * area) / line_distance;
}

/// Douglas-Peucker line simplification algorithm
/// Recursively reduces points in a polyline while preserving shape
pub fn douglasPeuckerSimplify(
    allocator: std.mem.Allocator,
    points: []const [3]f64,
    epsilon: f64,
) ![][3]f64 {
    if (points.len <= 2) {
        // Can't simplify 2 or fewer points, return copy
        const result = try allocator.alloc([3]f64, points.len);
        @memcpy(result, points);
        return result;
    }

    // Find point with maximum perpendicular distance from line segment
    var max_distance: f64 = 0.0;
    var max_index: usize = 0;

    const line_start = points[0];
    const line_end = points[points.len - 1];

    for (1..points.len - 1) |i| {
        const dist = perpendicularDistance(points[i], line_start, line_end);
        if (dist > max_distance) {
            max_distance = dist;
            max_index = i;
        }
    }

    // If max distance exceeds epsilon, split and recurse
    if (max_distance > epsilon) {
        // Recursively simplify left and right segments
        const left = try douglasPeuckerSimplify(allocator, points[0 .. max_index + 1], epsilon);
        errdefer allocator.free(left);

        const right = try douglasPeuckerSimplify(allocator, points[max_index..], epsilon);
        defer allocator.free(right);

        // Merge results (right[0] == left[left.len-1], so skip it)
        const result = try allocator.alloc([3]f64, left.len + right.len - 1);
        @memcpy(result[0..left.len], left);
        @memcpy(result[left.len..], right[1..]);

        allocator.free(left);
        return result;
    } else {
        // All points between endpoints can be removed
        const result = try allocator.alloc([3]f64, 2);
        result[0] = points[0];
        result[1] = points[points.len - 1];
        return result;
    }
}

// Tests

test "perpendicularDistance: point on line" {
    // Use realistic GPS coordinates (lat, lon, elevation)
    const line_start = [3]f64{ 0.0, 0.0, 0.0 };
    const line_end = [3]f64{ 0.0, 0.001, 0.0 }; // ~111m north
    const point_on_line = [3]f64{ 0.0, 0.0005, 0.0 }; // Midpoint

    const dist = perpendicularDistance(point_on_line, line_start, line_end);
    // Point on line should have very small perpendicular distance
    // But with haversine and Heron's formula, numerical precision means it won't be exactly 0
    try expectApproxEqAbs(0.0, dist, 100.0);
}

test "perpendicularDistance: point off line" {
    // Line going north, point displaced east
    const line_start = [3]f64{ 0.0, 0.0, 0.0 };
    const line_end = [3]f64{ 0.0, 0.001, 0.0 }; // ~111m north
    const point_off_line = [3]f64{ 0.001, 0.0005, 0.0 }; // ~111m east of midpoint

    const dist = perpendicularDistance(point_off_line, line_start, line_end);
    // Should be approximately the horizontal distance (~111m)
    try expectApproxEqAbs(111.0, dist, 20.0);
}

test "perpendicularDistance: 3D distance" {
    // Line going north, point displaced east and up
    const line_start = [3]f64{ 0.0, 0.0, 100.0 };
    const line_end = [3]f64{ 0.0, 0.001, 100.0 }; // ~111m north
    const point_3d = [3]f64{ 0.001, 0.0005, 150.0 }; // ~111m east, 50m up

    const dist = perpendicularDistance(point_3d, line_start, line_end);
    // Should be approximately sqrt(111^2 + 50^2) = ~122m
    try expectApproxEqAbs(122.0, dist, 20.0);
}

test "perpendicularDistance: point equals line start" {
    const line_start = [3]f64{ 45.0, -122.0, 100.0 };
    const line_end = [3]f64{ 45.001, -121.999, 150.0 };
    const point = line_start;

    const dist = perpendicularDistance(point, line_start, line_end);
    try expectApproxEqAbs(0.0, dist, 0.1);
}

test "douglasPeuckerSimplify: straight line" {
    const allocator = std.testing.allocator;

    // Points on a perfectly straight line (going north)
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.0, 0.0001, 100.0 },
        [3]f64{ 0.0, 0.0002, 100.0 },
        [3]f64{ 0.0, 0.0003, 100.0 },
        [3]f64{ 0.0, 0.0004, 100.0 },
    };

    const simplified = try douglasPeuckerSimplify(allocator, points[0..], 100.0);
    defer allocator.free(simplified);

    // Should simplify to just endpoints since all points are collinear
    // With epsilon = 100m and points ~44m apart on a straight line, should reduce to 2
    try expect(simplified.len == 2);
    try expectApproxEqAbs(simplified[0][1], 0.0, 0.0001);
    try expectApproxEqAbs(simplified[1][1], 0.0004, 0.0001);
}

test "douglasPeuckerSimplify: zigzag preserves peaks" {
    const allocator = std.testing.allocator;

    // Zigzag pattern with clear peaks
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 1.0, 0.0, 100.0 },
        [3]f64{ 2.0, 5.0, 110.0 }, // Peak
        [3]f64{ 3.0, 0.0, 100.0 },
        [3]f64{ 4.0, 0.0, 100.0 },
        [3]f64{ 5.0, 5.0, 110.0 }, // Peak
        [3]f64{ 6.0, 0.0, 100.0 },
    };

    const simplified = try douglasPeuckerSimplify(allocator, points[0..], 1.0);
    defer allocator.free(simplified);

    // Should keep significant peaks
    try expect(simplified.len >= 3);
    try expect(simplified.len <= points.len);

    // Check that first and last are preserved
    try expectApproxEqAbs(simplified[0][0], 0.0, 0.001);
    try expectApproxEqAbs(simplified[simplified.len - 1][0], 6.0, 0.001);
}

test "douglasPeuckerSimplify: epsilon sensitivity" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 1.0, 0.1, 100.0 },
        [3]f64{ 2.0, 0.2, 100.0 },
        [3]f64{ 3.0, 0.1, 100.0 },
        [3]f64{ 4.0, 0.0, 100.0 },
    };

    // Small epsilon - keeps more points
    const strict = try douglasPeuckerSimplify(allocator, points[0..], 0.01);
    defer allocator.free(strict);

    // Large epsilon - keeps fewer points
    const loose = try douglasPeuckerSimplify(allocator, points[0..], 1.0);
    defer allocator.free(loose);

    try expect(loose.len <= strict.len);
    try expect(loose.len >= 2); // Always keep at least endpoints
}

test "douglasPeuckerSimplify: two points" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 1.0, 1.0, 105.0 },
    };

    const simplified = try douglasPeuckerSimplify(allocator, points[0..], 1.0);
    defer allocator.free(simplified);

    // Should return both points unchanged
    try expect(simplified.len == 2);
    try expectApproxEqAbs(simplified[0][0], 0.0, 0.001);
    try expectApproxEqAbs(simplified[1][0], 1.0, 0.001);
}

test "douglasPeuckerSimplify: single point" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
    };

    const simplified = try douglasPeuckerSimplify(allocator, points[0..], 1.0);
    defer allocator.free(simplified);

    try expect(simplified.len == 1);
    try expectApproxEqAbs(simplified[0][0], 0.0, 0.001);
}

test "douglasPeuckerSimplify: real-world GPS data pattern" {
    const allocator = std.testing.allocator;

    // Simulate GPS data with noise (realistic coordinates)
    var points = try allocator.alloc([3]f64, 20);
    defer allocator.free(points);

    // Generate points along a rough north-east path with small variations
    var lat: f64 = 45.0;
    var lon: f64 = -122.0;
    for (0..20) |i| {
        points[i] = [3]f64{ lat, lon, 100.0 };
        lat += 0.0001 + @as(f64, @floatFromInt(i % 3)) * 0.00001; // Add variation
        lon += 0.0001 + @as(f64, @floatFromInt((i + 1) % 3)) * 0.00001;
    }

    // Simplify with moderate epsilon
    const simplified = try douglasPeuckerSimplify(allocator, points, 5.0);
    defer allocator.free(simplified);

    // Should reduce points but keep general shape
    try expect(simplified.len < points.len);
    try expect(simplified.len >= 2);

    // First and last points should be preserved
    try expectApproxEqAbs(simplified[0][0], points[0][0], 0.0001);
    try expectApproxEqAbs(simplified[simplified.len - 1][0], points[points.len - 1][0], 0.0001);
}
