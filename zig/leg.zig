const std = @import("std");
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const bearingTo = @import("gpspoint.zig").bearingTo;

const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;
const expectApproxEqAbs = std.testing.expectApproxEqAbs;

/// Interval between two consecutive waypoints.
/// Finest-grained unit — belongs to a section (sectionIdx).
pub const LegStats = struct {
    legId: usize,
    sectionIdx: usize, // index of the section this leg belongs to
    startIndex: usize,
    endIndex: usize,
    pointCount: usize,
    startPoint: [3]f64, // [lat, lon, elevation]
    endPoint: [3]f64, // [lat, lon, elevation]
    startLocation: []const u8, // Name/label of start waypoint
    endLocation: []const u8, // Name/label of end waypoint
    totalDistance: f64, // meters
    totalElevation: f64, // meters elevation gain
    totalElevationLoss: f64, // meters elevation loss
    avgSlope: f64, // percentage
    maxSlope: f64, // percentage
    minElevation: f64,
    maxElevation: f64,
    bearing: f64, // degrees from north
    difficulty: u8, // 1–5 (Tobler effort ratio vs flat terrain)
    estimatedDuration: f64, // seconds (Naismith hiking function estimate)
};

/// Compute leg statistics between all consecutive waypoints along the given trace.
pub fn computeFromWaypoints(trace: *const Trace, allocator: std.mem.Allocator, waypoints: []const Waypoint) ![]LegStats {
    if (waypoints.len < 2) {
        return &[_]LegStats{};
    }

    const num_legs = waypoints.len - 1;
    var legs = std.ArrayList(LegStats){};
    errdefer legs.deinit(allocator);

    // Track the search floor so each waypoint is found after the previous one.
    // This correctly handles loop courses where the same area is passed twice.
    var search_start: usize = 0;

    // Track which section each leg belongs to.
    // Increments each time a section-boundary waypoint (isSectionBoundary) is encountered
    // after the first one. Legs before the first section boundary get sectionIdx = 0.
    var current_section_idx: usize = 0;
    var section_active: bool = false;

    for (0..num_legs) |i| {
        if (waypoints[i].isSectionBoundary()) {
            if (section_active) {
                current_section_idx += 1;
            } else {
                section_active = true;
            }
        }
        const start_wpt = waypoints[i];
        const end_wpt = waypoints[i + 1];

        // Find closest points on trace to waypoints (using 2D coordinates, then use trace's elevation)
        const start_coord = [3]f64{ start_wpt.lat, start_wpt.lon, 0.0 };
        const end_coord = [3]f64{ end_wpt.lat, end_wpt.lon, 0.0 };

        const start_result = trace.findClosestPointAfter(start_coord, search_start) orelse continue;
        const end_result = trace.findClosestPointAfter(end_coord, start_result.index + 1) orelse continue;
        search_start = start_result.index + 1;

        const bearing = bearingTo(start_coord, end_coord);

        const start_index = start_result.index;
        const end_index = end_result.index;

        if (start_index >= end_index) continue;

        // Compute leg statistics
        const dist = trace.cumulativeDistances[end_index] - trace.cumulativeDistances[start_index];
        const elevation_gain = trace.cumulativeElevations[end_index] - trace.cumulativeElevations[start_index];
        const elevation_loss = trace.cumulativeElevationLoss[end_index] - trace.cumulativeElevationLoss[start_index];

        // Find min/max elevation and max slope in leg
        var min_elevation = trace.points[start_index][2];
        var max_elevation = trace.points[start_index][2];
        var max_slope: f64 = 0.0;

        for (start_index..end_index) |j| {
            const ele = trace.points[j][2];
            min_elevation = @min(min_elevation, ele);
            max_elevation = @max(max_elevation, ele);
            max_slope = @max(max_slope, @abs(trace.slopes[j]));
        }

        const avg_slope = if (dist > 0) ((elevation_gain - elevation_loss) / dist) * 100.0 else 0.0;

        // Naismith's rule: time_h = dist_km/5 + gain_m/600
        // Uses total elevation gain (not net), so it correctly rates legs
        // with high cumulative climbing even when gain and loss cancel out.
        const dist_km = dist / 1000.0;
        const flat_time = dist_km / 5.0;
        const naismith_time = flat_time + elevation_gain / 600.0;
        const estimated_duration = naismith_time * 3600.0;
        const effort_ratio = if (flat_time > 0) naismith_time / flat_time else 1.0;
        const difficulty: u8 = if (effort_ratio < 1.2) 1 else if (effort_ratio < 1.5) 2 else if (effort_ratio < 2.0) 3 else if (effort_ratio < 2.7) 4 else 5;

        const point_count = end_index - start_index + 1;

        legs.append(allocator, LegStats{
            .legId = i,
            .sectionIdx = current_section_idx,
            .startIndex = start_index,
            .endIndex = end_index,
            .pointCount = point_count,
            .startPoint = trace.points[start_index],
            .endPoint = trace.points[end_index],
            .startLocation = start_wpt.name,
            .endLocation = end_wpt.name,
            .totalDistance = dist,
            .totalElevation = elevation_gain,
            .totalElevationLoss = elevation_loss,
            .avgSlope = avg_slope,
            .maxSlope = max_slope,
            .minElevation = min_elevation,
            .maxElevation = max_elevation,
            .bearing = bearing,
            .difficulty = difficulty,
            .estimatedDuration = estimated_duration,
        }) catch |err| return err;
    }

    return try legs.toOwnedSlice(allocator);
}

test "computeLegsFromWaypoints: basic functionality" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 37.0, -122.0, 100.0 },
        [3]f64{ 37.01, -122.01, 120.0 },
        [3]f64{ 37.02, -122.02, 140.0 },
        [3]f64{ 37.03, -122.03, 160.0 },
        [3]f64{ 37.04, -122.04, 180.0 },
        [3]f64{ 37.05, -122.05, 200.0 },
        [3]f64{ 37.06, -122.06, 220.0 },
        [3]f64{ 37.07, -122.07, 240.0 },
        [3]f64{ 37.08, -122.08, 260.0 },
        [3]f64{ 37.09, -122.09, 280.0 },
        [3]f64{ 37.10, -122.10, 300.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 37.0, .lon = -122.0, .name = "Start", .time = null },
        .{ .lat = 37.05, .lon = -122.05, .name = "Middle", .time = null },
        .{ .lat = 37.10, .lon = -122.10, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 2), legs.len);

    for (legs) |leg| {
        try expect(leg.totalDistance > 0.0);
        try expect(leg.totalElevation >= 0.0);
        try expect(leg.pointCount > 0);
        try expect(leg.startIndex < leg.endIndex);
        try expect(leg.endIndex <= trace.points.len);
    }
}

test "computeLegsFromWaypoints: single waypoint returns empty" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 37.0, -122.0, 100.0 },
        [3]f64{ 37.1, -122.1, 200.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 37.0, .lon = -122.0, .name = "Only", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 0), legs.len);
}

test "computeLegsFromWaypoints: elevation statistics" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.01, 0.01, 150.0 },
        [3]f64{ 0.02, 0.02, 200.0 },
        [3]f64{ 0.03, 0.03, 180.0 },
        [3]f64{ 0.04, 0.04, 220.0 },
        [3]f64{ 0.05, 0.05, 190.0 },
        [3]f64{ 0.06, 0.06, 160.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "Start", .time = null },
        .{ .lat = 0.06, .lon = 0.06, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);

    const leg = legs[0];
    try expect(leg.minElevation >= 100.0);
    try expect(leg.maxElevation <= 220.0);
    try expect(leg.totalElevation > 0.0);
    try expect(leg.totalElevationLoss > 0.0);
}

test "computeLegsFromWaypoints: section indices are valid" {
    const allocator = std.testing.allocator;

    var points = try allocator.alloc([3]f64, 50);
    defer allocator.free(points);

    for (0..50) |i| {
        const t = @as(f64, @floatFromInt(i)) / 50.0;
        points[i] = [3]f64{ t, t, 100.0 + t * 100.0 };
    }

    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "W1", .time = null },
        .{ .lat = 0.5, .lon = 0.5, .name = "W2", .time = null },
        .{ .lat = 1.0, .lon = 1.0, .name = "W3", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 2), legs.len);

    try expect(legs[0].startIndex < legs[0].endIndex);
    try expect(legs[0].endIndex <= legs[1].startIndex);
    try expect(legs[1].startIndex < legs[1].endIndex);
    try expect(legs[1].endIndex <= trace.points.len);
}

test "computeLegsFromWaypoints: slope calculations" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 0.0 },
        [3]f64{ 0.001, 0.001, 50.0 },
        [3]f64{ 0.002, 0.002, 100.0 },
        [3]f64{ 0.003, 0.003, 150.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "Bottom", .time = null },
        .{ .lat = 0.003, .lon = 0.003, .name = "Top", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);

    const leg = legs[0];
    try expect(leg.avgSlope > 0.0);
    try expect(leg.maxSlope > 0.0);
}

test "difficulty: flat terrain is Easy (1)" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 100.1 },
        [3]f64{ 0.002, 0.0, 100.2 },
        [3]f64{ 0.003, 0.0, 100.3 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);
    try expectEqual(@as(u8, 1), legs[0].difficulty);
    try expect(legs[0].estimatedDuration > 0.0);
}

test "difficulty: steep terrain is Hard or above" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 0.0 },
        [3]f64{ 0.001, 0.001, 50.0 },
        [3]f64{ 0.002, 0.002, 100.0 },
        [3]f64{ 0.003, 0.003, 150.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "Bottom", .time = null },
        .{ .lat = 0.003, .lon = 0.003, .name = "Top", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);
    try expect(legs[0].difficulty >= 3);
    try expect(legs[0].estimatedDuration > 0.0);
}

// ─── Difficulty tier precision tests ────────────────────────────────────────
//
// Each test uses 4 points covering ~333m (3 × 111m per 0.001° lat at equator).
// Haversine distance ≈ 333.6m → dist_km ≈ 0.3336
// effort_ratio = 1 + elevation_gain / (120 × dist_km) ≈ 1 + elevation_gain / 40.03
//
// Tier boundaries (elevation_gain for dist ≈ 0.3336 km):
//   1→2 at ~8.0m    (effort_ratio = 1.2)
//   2→3 at ~20.0m   (effort_ratio = 1.5)
//   3→4 at ~40.0m   (effort_ratio = 2.0)
//   4→5 at ~68.0m   (effort_ratio = 2.7)

test "difficulty: tier 2 Moderate (effort_ratio 1.2–1.5)" {
    const allocator = std.testing.allocator;

    // 14m gain → effort ≈ 1.35 → difficulty 2
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 0.0 },
        [3]f64{ 0.001, 0.0, 4.67 },
        [3]f64{ 0.002, 0.0, 9.33 },
        [3]f64{ 0.003, 0.0, 14.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);
    try expectEqual(@as(u8, 2), legs[0].difficulty);
}

test "difficulty: tier 3 Hard (effort_ratio 1.5–2.0)" {
    const allocator = std.testing.allocator;

    // 30m gain → effort ≈ 1.75 → difficulty 3
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 0.0 },
        [3]f64{ 0.001, 0.0, 10.0 },
        [3]f64{ 0.002, 0.0, 20.0 },
        [3]f64{ 0.003, 0.0, 30.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);
    try expectEqual(@as(u8, 3), legs[0].difficulty);
}

test "difficulty: tier 4 Very Hard (effort_ratio 2.0–2.7)" {
    const allocator = std.testing.allocator;

    // 55m gain → effort ≈ 2.37 → difficulty 4
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 0.0 },
        [3]f64{ 0.001, 0.0, 18.0 },
        [3]f64{ 0.002, 0.0, 37.0 },
        [3]f64{ 0.003, 0.0, 55.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);
    try expectEqual(@as(u8, 4), legs[0].difficulty);
}

test "difficulty: tier 5 Extreme (effort_ratio >= 2.7)" {
    const allocator = std.testing.allocator;

    // 100m gain → effort ≈ 3.50 → difficulty 5
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 0.0 },
        [3]f64{ 0.001, 0.0, 33.0 },
        [3]f64{ 0.002, 0.0, 67.0 },
        [3]f64{ 0.003, 0.0, 100.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);
    try expectEqual(@as(u8, 5), legs[0].difficulty);
}

test "estimatedDuration follows Naismith formula" {
    const allocator = std.testing.allocator;

    // Flat 1km section: 0m elevation gain
    // flat_time = 1.0/5 = 0.2h, naismith_time = 0.2h, estimated_duration = 720s
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 100.0 },
        [3]f64{ 0.002, 0.0, 100.0 },
        [3]f64{ 0.003, 0.0, 100.0 },
        [3]f64{ 0.004, 0.0, 100.0 },
        [3]f64{ 0.005, 0.0, 100.0 },
        [3]f64{ 0.006, 0.0, 100.0 },
        [3]f64{ 0.007, 0.0, 100.0 },
        [3]f64{ 0.008, 0.0, 100.0 },
        [3]f64{ 0.009, 0.0, 100.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .time = null },
        .{ .lat = 0.009, .lon = 0.0, .name = "End", .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    try expectEqual(@as(usize, 1), legs.len);
    const leg = legs[0];
    // dist ≈ 1001m → flat_time = 1.001/5 = 0.2002h → duration ≈ 720.7s
    // Allow ±30s tolerance for Haversine approximation
    try expect(leg.estimatedDuration > 690.0);
    try expect(leg.estimatedDuration < 750.0);
    try expectEqual(@as(u8, 1), leg.difficulty);
}

test "computeLegsFromWaypoints: sectionIdx links legs to their section" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 100.0 },
        [3]f64{ 0.002, 0.0, 100.0 },
        [3]f64{ 0.003, 0.0, 100.0 },
        [3]f64{ 0.004, 0.0, 100.0 },
        [3]f64{ 0.005, 0.0, 100.0 },
        [3]f64{ 0.006, 0.0, 100.0 },
        [3]f64{ 0.007, 0.0, 100.0 },
        [3]f64{ 0.008, 0.0, 100.0 },
        [3]f64{ 0.009, 0.0, 100.0 },
        [3]f64{ 0.010, 0.0, 100.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    // Section boundaries: Start at 0, TimeBarrier at 0.004, Arrival at 0.008
    // Plain waypoints at 0.002 and 0.006 create extra legs within sections
    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",       .time = null },
        .{ .lat = 0.002, .lon = 0.0, .name = "Plain1",  .wptType = null,           .time = null },
        .{ .lat = 0.004, .lon = 0.0, .name = "BH1",     .wptType = "TimeBarrier",  .time = null },
        .{ .lat = 0.006, .lon = 0.0, .name = "Plain2",  .wptType = null,           .time = null },
        .{ .lat = 0.008, .lon = 0.0, .name = "Arrival", .wptType = "Arrival",      .time = null },
    };

    const legs = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer allocator.free(legs);

    // 4 legs: [Start→Plain1], [Plain1→TimeBarrier], [TimeBarrier→Plain2], [Plain2→Arrival]
    try expectEqual(@as(usize, 4), legs.len);

    // Legs 0 and 1 belong to section 0 (Start → TimeBarrier)
    try expectEqual(@as(usize, 0), legs[0].sectionIdx);
    try expectEqual(@as(usize, 0), legs[1].sectionIdx);

    // Legs 2 and 3 belong to section 1 (TimeBarrier → Arrival)
    try expectEqual(@as(usize, 1), legs[2].sectionIdx);
    try expectEqual(@as(usize, 1), legs[3].sectionIdx);
}
