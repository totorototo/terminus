const std = @import("std");
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const bearingTo = @import("gpspoint.zig").bearingTo;
const minetti = @import("minetti.zig");

const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;

/// Interval between two consecutive stage-boundary waypoints (Start/LifeBase/Arrival).
/// Top-level grouping — contains multiple sections.
pub const StageStats = struct {
    stageId: usize,
    startIndex: usize,
    endIndex: usize,
    pointCount: usize,
    startPoint: [3]f64, // [lat, lon, elevation]
    endPoint: [3]f64, // [lat, lon, elevation]
    startLocation: []const u8, // Name of start waypoint (Start/LifeBase/Arrival)
    endLocation: []const u8, // Name of end waypoint
    totalDistance: f64, // meters
    totalElevation: f64, // meters elevation gain
    totalElevationLoss: f64, // meters elevation loss
    avgSlope: f64, // percentage
    maxSlope: f64, // percentage
    minElevation: f64,
    maxElevation: f64,
    startTime: ?i64, // Unix epoch time in seconds
    endTime: ?i64, // Unix epoch time in seconds
    bearing: f64, // degrees from north
    difficulty: u8, // 1–5 (Minetti pace factor vs flat: <1.1→1, <1.4→2, <1.8→3, <2.5→4, ≥2.5→5)
    estimatedDuration: f64, // seconds (Minetti model, base pace 5:30/km with cumulative fatigue)
    paceFactor: f64, // average Minetti pace factor relative to flat (1.0 = flat equivalent)
    maxCompletionTime: ?i64, // seconds allowed (endTime - startTime), null if absent
};

/// Compute stage statistics between consecutive stage-boundary waypoints (Start/LifeBase/Arrival).
/// TimeBarrier waypoints are skipped — they only appear in sections, not stages.
pub fn computeFromWaypoints(trace: *const Trace, allocator: std.mem.Allocator, waypoints: []const Waypoint) !?[]StageStats {
    // Collect stage-boundary waypoints (Start/LifeBase/Arrival)
    var stage_wpts = std.ArrayList(Waypoint){};
    defer stage_wpts.deinit(allocator);

    for (waypoints) |wpt| {
        if (wpt.isStageBoundary()) {
            try stage_wpts.append(allocator, wpt);
        }
    }

    if (stage_wpts.items.len < 2) {
        return null;
    }

    const num_stages = stage_wpts.items.len - 1;
    var stages = std.ArrayList(StageStats){};
    errdefer stages.deinit(allocator);

    var search_start: usize = 0;

    // Cumulative effort-weighted distance (m) for fatigue model.
    // Accumulates across stages in race order.
    var d_eff: f64 = 0.0;

    for (0..num_stages) |i| {
        const start_wpt = stage_wpts.items[i];
        const end_wpt = stage_wpts.items[i + 1];

        const start_coord = [3]f64{ start_wpt.lat, start_wpt.lon, 0.0 };
        const end_coord = [3]f64{ end_wpt.lat, end_wpt.lon, 0.0 };

        const start_result = trace.findClosestPointAfter(start_coord, search_start) orelse continue;
        const end_result = trace.findClosestPointAfter(end_coord, start_result.index + 1) orelse continue;
        search_start = start_result.index + 1;

        const bearing = bearingTo(start_coord, end_coord);

        const start_index = start_result.index;
        const end_index = end_result.index;

        if (start_index >= end_index) continue;

        const dist = trace.cumulativeDistances[end_index] - trace.cumulativeDistances[start_index];
        const elevation_gain = trace.cumulativeElevations[end_index] - trace.cumulativeElevations[start_index];
        const elevation_loss = trace.cumulativeElevationLoss[end_index] - trace.cumulativeElevationLoss[start_index];

        var min_elevation = trace.points[start_index][2];
        var max_elevation = trace.points[start_index][2];
        var max_slope: f64 = 0.0;
        var total_time: f64 = 0.0;
        var total_weighted_dist: f64 = 0.0;

        for (start_index..end_index) |j| {
            const ele = trace.points[j][2];
            min_elevation = @min(min_elevation, ele);
            max_elevation = @max(max_elevation, ele);
            max_slope = @max(max_slope, @abs(trace.slopes[j]));

            const slope_frac = trace.slopes[j] / 100.0;
            const seg_dist = trace.cumulativeDistances[j + 1] - trace.cumulativeDistances[j];
            const pf = minetti.paceFactor(slope_frac);
            const fatigue_factor = 1.0 + minetti.K_FATIGUE * (d_eff / 1000.0);
            total_time += (seg_dist / 1000.0) * minetti.DEFAULT_BASE_PACE_S_PER_KM * pf * fatigue_factor;
            total_weighted_dist += seg_dist * pf;
            d_eff += seg_dist * pf;
        }

        const avg_slope = if (dist > 0) ((elevation_gain - elevation_loss) / dist) * 100.0 else 0.0;

        const avg_pf = if (dist > 0) total_weighted_dist / dist else 1.0;
        const estimated_duration = total_time;
        const difficulty: u8 = if (avg_pf < 1.1) 1 else if (avg_pf < 1.4) 2 else if (avg_pf < 1.8) 3 else if (avg_pf < 2.5) 4 else 5;

        const point_count = end_index - start_index + 1;

        stages.append(allocator, StageStats{
            .stageId = i,
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
            .startTime = start_wpt.time,
            .endTime = end_wpt.time,
            .bearing = bearing,
            .difficulty = difficulty,
            .estimatedDuration = estimated_duration,
            .paceFactor = avg_pf,
            .maxCompletionTime = if (start_wpt.time != null and end_wpt.time != null)
                end_wpt.time.? - start_wpt.time.?
            else
                null,
        }) catch |err| return err;
    }

    return try stages.toOwnedSlice(allocator);
}

test "computeStagesFromWaypoints: returns null with fewer than 2 stage boundaries" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 110.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    // No stage boundaries at all
    const waypoints_none = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "A", .time = null },
        .{ .lat = 0.001, .lon = 0.0, .name = "B", .time = null },
    };
    try expect((try computeFromWaypoints(&trace, allocator, &waypoints_none)) == null);

    // Only one stage boundary (Start)
    const waypoints_one = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.001, .lon = 0.0, .name = "Plain", .time = null },
    };
    try expect((try computeFromWaypoints(&trace, allocator, &waypoints_one)) == null);
}

test "computeStagesFromWaypoints: TimeBarrier waypoints are excluded" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 105.0 },
        [3]f64{ 0.002, 0.0, 110.0 },
        [3]f64{ 0.003, 0.0, 115.0 },
        [3]f64{ 0.004, 0.0, 120.0 },
        [3]f64{ 0.005, 0.0, 125.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    // TimeBarrier at 0.002 is a section boundary but NOT a stage boundary — should be skipped.
    // Result: 1 stage (Start→Arrival), not 2.
    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",       .time = null },
        .{ .lat = 0.002, .lon = 0.0, .name = "TB1",     .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.005, .lon = 0.0, .name = "Arrival", .wptType = "Arrival",     .time = null },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (stages) |s| allocator.free(s);

    try expect(stages != null);
    try expectEqual(@as(usize, 1), stages.?.len);
    try expectEqual(@as(usize, 0), stages.?[0].stageId);
    try expect(stages.?[0].totalDistance > 0.0);
}

test "computeStagesFromWaypoints: Start-LifeBase-Arrival produces two stages" {
    const allocator = std.testing.allocator;
    var points = try allocator.alloc([3]f64, 10);
    defer allocator.free(points);
    for (0..10) |i| {
        const t = @as(f64, @floatFromInt(i)) * 0.001;
        points[i] = [3]f64{ t, 0.0, 100.0 + t * 500.0 };
    }
    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",    .wptType = "Start",    .time = null },
        .{ .lat = 0.005, .lon = 0.0, .name = "LifeBase", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.009, .lon = 0.0, .name = "Arrival",  .wptType = "Arrival",  .time = null },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (stages) |s| allocator.free(s);

    try expect(stages != null);
    try expectEqual(@as(usize, 2), stages.?.len);
    // stageId is zero-indexed and sequential
    try expectEqual(@as(usize, 0), stages.?[0].stageId);
    try expectEqual(@as(usize, 1), stages.?[1].stageId);
    // Each stage covers a non-zero distance
    try expect(stages.?[0].totalDistance > 0.0);
    try expect(stages.?[1].totalDistance > 0.0);
    // Stages are non-overlapping: first stage ends where second begins
    try expect(stages.?[0].endIndex <= stages.?[1].startIndex);
}

test "stage maxCompletionTime is set from waypoint timestamps" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 105.0 },
        [3]f64{ 0.002, 0.0, 110.0 },
        [3]f64{ 0.003, 0.0, 115.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start",   .time = 1_000_000 },
        .{ .lat = 0.003, .lon = 0.0, .name = "End",   .wptType = "Arrival", .time = 1_003_600 },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (stages) |st| allocator.free(st);

    try expect(stages != null);
    try expectEqual(@as(usize, 1), stages.?.len);
    try expect(stages.?[0].maxCompletionTime != null);
    try expectEqual(@as(i64, 3600), stages.?[0].maxCompletionTime.?);
    try expectEqual(@as(i64, 1_000_000), stages.?[0].startTime.?);
    try expectEqual(@as(i64, 1_003_600), stages.?[0].endTime.?);
}

test "stage maxCompletionTime is null when stage waypoints have no timestamps" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 105.0 },
        [3]f64{ 0.002, 0.0, 110.0 },
        [3]f64{ 0.003, 0.0, 115.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start",   .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "End",   .wptType = "Arrival", .time = null },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (stages) |st| allocator.free(st);

    try expect(stages != null);
    try expectEqual(@as(usize, 1), stages.?.len);
    try expectEqual(@as(?i64, null), stages.?[0].maxCompletionTime);
}
