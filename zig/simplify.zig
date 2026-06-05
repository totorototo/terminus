const std = @import("std");
const distance = @import("gpspoint.zig").distance;

const expect = std.testing.expect;
const expectApproxEqAbs = std.testing.expectApproxEqAbs;

/// Calculate perpendicular distance from point to line segment
/// Uses 2D haversine distance (ignoring elevation) so simplification
/// preserves horizontal path shape rather than being influenced by
/// elevation noise.
pub fn perpendicularDistance(point: [3]f64, line_start: [3]f64, line_end: [3]f64) f64 {
    // Calculate total line segment distance (cache to avoid duplicate call)
    const line_distance = distance(line_start, line_end);

    // Special case: line segment is actually a point
    if (line_distance < 0.001) {
        return distance(point, line_start);
    }

    // Calculate distances to create triangle
    const dist_start_to_point = distance(line_start, point);
    const dist_end_to_point = distance(line_end, point);

    // perpendicular distance = 2 * area / base.
    // Kahan's stable triangle area avoids the catastrophic cancellation that
    // Heron's formula suffers on the near-degenerate (needle) triangles that
    // dominate Douglas-Peucker, where the point lies almost on the line.
    const area = triangleArea(line_distance, dist_start_to_point, dist_end_to_point);
    return (2.0 * area) / line_distance;
}

/// Numerically stable triangle area from its three side lengths (Kahan, 2014).
/// Sides are sorted descending and grouped so each subtraction stays well-
/// conditioned; returns 0 for degenerate (collinear) triangles.
fn triangleArea(side_a: f64, side_b: f64, side_c: f64) f64 {
    var a = side_a;
    var b = side_b;
    var c = side_c;

    // Sort so that a >= b >= c.
    if (a < b) std.mem.swap(f64, &a, &b);
    if (b < c) std.mem.swap(f64, &b, &c);
    if (a < b) std.mem.swap(f64, &a, &b);

    const t = (a + (b + c)) * (c - (a - b)) * (c + (a - b)) * (a + (b - c));
    if (t <= 0.0) return 0.0;
    return 0.25 * @sqrt(t);
}

/// Douglas-Peucker line simplification.
/// Returns the indices (ascending) of the points that survive simplification.
/// Endpoints are always kept. Caller owns the returned slice.
///
/// Uses a keep-mask plus an explicit work stack rather than recursion, so it
/// has no call-stack depth limit and always produces the exact, complete
/// simplification regardless of how deeply the polyline subdivides.
pub fn douglasPeuckerIndices(
    allocator: std.mem.Allocator,
    points: []const [3]f64,
    epsilon: f64,
) ![]usize {
    if (points.len <= 2) {
        const out = try allocator.alloc(usize, points.len);
        for (0..points.len) |i| out[i] = i;
        return out;
    }

    const keep = try allocator.alloc(bool, points.len);
    defer allocator.free(keep);
    @memset(keep, false);
    keep[0] = true;
    keep[points.len - 1] = true;

    const Segment = struct { lo: usize, hi: usize };
    var stack = std.ArrayList(Segment){};
    defer stack.deinit(allocator);
    try stack.append(allocator, .{ .lo = 0, .hi = points.len - 1 });

    while (stack.items.len > 0) {
        const seg = stack.items[stack.items.len - 1];
        stack.items.len -= 1;

        // Find the point of maximum perpendicular distance strictly inside the segment.
        var max_distance: f64 = 0.0;
        var max_index: usize = 0;
        const line_start = points[seg.lo];
        const line_end = points[seg.hi];

        var i = seg.lo + 1;
        while (i < seg.hi) : (i += 1) {
            const dist = perpendicularDistance(points[i], line_start, line_end);
            if (dist > max_distance) {
                max_distance = dist;
                max_index = i;
            }
        }

        // If it exceeds epsilon, keep it and recurse into both halves.
        if (max_distance > epsilon) {
            keep[max_index] = true;
            try stack.append(allocator, .{ .lo = seg.lo, .hi = max_index });
            try stack.append(allocator, .{ .lo = max_index, .hi = seg.hi });
        }
    }

    var indices = std.ArrayList(usize){};
    defer indices.deinit(allocator);
    for (0..points.len) |idx| {
        if (keep[idx]) try indices.append(allocator, idx);
    }
    return try indices.toOwnedSlice(allocator);
}

/// Douglas-Peucker line simplification returning the surviving points.
/// Thin wrapper over `douglasPeuckerIndices`. Caller owns the result.
pub fn douglasPeuckerSimplify(
    allocator: std.mem.Allocator,
    points: []const [3]f64,
    epsilon: f64,
) ![][3]f64 {
    const idx = try douglasPeuckerIndices(allocator, points, epsilon);
    defer allocator.free(idx);

    const result = try allocator.alloc([3]f64, idx.len);
    for (idx, 0..) |src, i| result[i] = points[src];
    return result;
}

// Tests

test "douglasPeuckerIndices: returns ascending source indices that map back to surviving points" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 1.0, 0.0, 100.0 },
        [3]f64{ 2.0, 5.0, 110.0 }, // peak — must survive
        [3]f64{ 3.0, 0.0, 100.0 },
        [3]f64{ 4.0, 0.0, 100.0 },
    };

    const idx = try douglasPeuckerIndices(allocator, points[0..], 1.0);
    defer allocator.free(idx);

    // Indices are strictly ascending and within bounds.
    try expect(idx.len >= 2);
    for (1..idx.len) |i| try expect(idx[i] > idx[i - 1]);
    try expect(idx[idx.len - 1] < points.len);

    // Endpoints and the peak are preserved.
    try std.testing.expectEqual(@as(usize, 0), idx[0]);
    try std.testing.expectEqual(@as(usize, points.len - 1), idx[idx.len - 1]);
    var has_peak = false;
    for (idx) |s| {
        if (s == 2) has_peak = true;
    }
    try expect(has_peak);

    // Indices select exactly the same points the slice API returns.
    const pts = try douglasPeuckerSimplify(allocator, points[0..], 1.0);
    defer allocator.free(pts);
    try std.testing.expectEqual(pts.len, idx.len);
    for (idx, 0..) |s, i| {
        try expectApproxEqAbs(points[s][0], pts[i][0], 1e-9);
        try expectApproxEqAbs(points[s][1], pts[i][1], 1e-9);
    }
}

test "perpendicularDistance: point on line" {
    // Use realistic GPS coordinates (lat, lon, elevation)
    const line_start = [3]f64{ 0.0, 0.0, 0.0 };
    const line_end = [3]f64{ 0.0, 0.001, 0.0 }; // ~111m north
    const point_on_line = [3]f64{ 0.0, 0.0005, 0.0 }; // Midpoint

    const dist = perpendicularDistance(point_on_line, line_start, line_end);
    // Collinear points: the stable area formula collapses this to ~0 (Heron's
    // formula previously needed a 100m tolerance here due to cancellation).
    try expectApproxEqAbs(0.0, dist, 0.01);
}

test "triangleArea: stable on a needle triangle" {
    // Near-degenerate triangle: base 1000, the apex almost on the base.
    // True height ≈ 0.001 → area ≈ 0.5. Heron's formula loses most precision here.
    const base: f64 = 1000.0;
    const left: f64 = 500.0000005;
    const right: f64 = 500.0000005;
    const area = triangleArea(base, left, right);
    // height = 2*area/base; expect a tiny but finite, non-negative height.
    const height = 2.0 * area / base;
    try expect(height >= 0.0);
    try expect(height < 1.0);
}

test "triangleArea: degenerate triangle returns zero" {
    // Exactly collinear: base equals the sum of the other two sides.
    try expectApproxEqAbs(0.0, triangleArea(10.0, 6.0, 4.0), 1e-9);
}

test "triangleArea: matches known 3-4-5 right triangle" {
    // Area = 6 regardless of side order.
    try expectApproxEqAbs(6.0, triangleArea(3.0, 4.0, 5.0), 1e-9);
    try expectApproxEqAbs(6.0, triangleArea(5.0, 4.0, 3.0), 1e-9);
    try expectApproxEqAbs(6.0, triangleArea(4.0, 5.0, 3.0), 1e-9);
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

// ── Benchmarks ────────────────────────────────────────────────────────────────
//
// Synthetic mountain-trail GPS path: north-east bearing with sinusoidal
// switchbacks (lateral noise) and an ascending elevation profile.
// This exercises the typical real-world input shape — neither a perfectly
// straight line (trivially fast) nor a worst-case adversarial zigzag.
//
// Thresholds are deliberately generous so they pass in debug mode, but are
// tight enough to catch an accidental O(n²) regression: the current algorithm
// is O(n·depth) where depth ≤ MAX_RECURSION_DEPTH (64), so 100 K points
// perform ~6.4 M perpendicular-distance evaluations. An O(n²) implementation
// would require ~10 B evaluations — orders of magnitude beyond the threshold.

fn makeSyntheticTrace(allocator: std.mem.Allocator, n: usize) ![][3]f64 {
    const points = try allocator.alloc([3]f64, n);
    for (0..n) |i| {
        const t = @as(f64, @floatFromInt(i)) / @as(f64, @floatFromInt(n));
        // Northward bearing with sinusoidal lateral displacement (switchbacks)
        const lat = 45.0 + t * 0.5;
        const lon = -122.0 + t * 0.3 + @sin(t * std.math.pi * 30.0) * 0.002;
        // Ascending profile with undulating ridge line
        const elev = 500.0 + t * 1500.0 + @sin(t * std.math.pi * 60.0) * 100.0;
        points[i] = [3]f64{ lat, lon, elev };
    }
    return points;
}

test "bench: douglasPeuckerSimplify 10K points completes within 2s" {
    const allocator = std.testing.allocator;
    const n = 10_000;
    const limit_ns = 2 * std.time.ns_per_s;

    const points = try makeSyntheticTrace(allocator, n);
    defer allocator.free(points);

    var timer = try std.time.Timer.start();
    const simplified = try douglasPeuckerSimplify(allocator, points, 10.0);
    const elapsed_ns = timer.read();
    defer allocator.free(simplified);

    std.debug.print(
        "\n[bench] douglasPeuckerSimplify {d}K points: {d}ms  ({d} → {d} pts)\n",
        .{ n / 1000, elapsed_ns / std.time.ns_per_ms, n, simplified.len },
    );

    try expect(simplified.len >= 2);
    try expect(simplified.len <= n);
    try expect(elapsed_ns < limit_ns);
}

test "bench: douglasPeuckerSimplify 50K points completes within 10s" {
    const allocator = std.testing.allocator;
    const n = 50_000;
    const limit_ns = 10 * std.time.ns_per_s;

    const points = try makeSyntheticTrace(allocator, n);
    defer allocator.free(points);

    var timer = try std.time.Timer.start();
    const simplified = try douglasPeuckerSimplify(allocator, points, 10.0);
    const elapsed_ns = timer.read();
    defer allocator.free(simplified);

    std.debug.print(
        "\n[bench] douglasPeuckerSimplify {d}K points: {d}ms  ({d} → {d} pts)\n",
        .{ n / 1000, elapsed_ns / std.time.ns_per_ms, n, simplified.len },
    );

    try expect(simplified.len >= 2);
    try expect(simplified.len <= n);
    try expect(elapsed_ns < limit_ns);
}

test "bench: douglasPeuckerSimplify 100K points completes within 30s" {
    const allocator = std.testing.allocator;
    const n = 100_000;
    const limit_ns = 30 * std.time.ns_per_s;

    const points = try makeSyntheticTrace(allocator, n);
    defer allocator.free(points);

    var timer = try std.time.Timer.start();
    const simplified = try douglasPeuckerSimplify(allocator, points, 10.0);
    const elapsed_ns = timer.read();
    defer allocator.free(simplified);

    std.debug.print(
        "\n[bench] douglasPeuckerSimplify {d}K points: {d}ms  ({d} → {d} pts)\n",
        .{ n / 1000, elapsed_ns / std.time.ns_per_ms, n, simplified.len },
    );

    try expect(simplified.len >= 2);
    try expect(simplified.len <= n);
    try expect(elapsed_ns < limit_ns);
}
