const std = @import("std");
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const bearingTo = @import("gpspoint.zig").bearingTo;

/// Interval between two consecutive section-boundary waypoints (Start/TimeBarrier/LifeBase/Arrival).
/// Has timing info (cutoffs). Belongs to a stage (stageIdx).
pub const SectionStats = struct {
    sectionId: usize,
    stageIdx: usize, // index of the stage this section belongs to
    startIndex: usize,
    endIndex: usize,
    pointCount: usize,
    startPoint: [3]f64, // [lat, lon, elevation]
    endPoint: [3]f64, // [lat, lon, elevation]
    startLocation: []const u8, // Name of start waypoint (Start/TimeBarrier/LifeBase/Arrival)
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
    difficulty: u8, // 1–5 (Tobler effort ratio vs flat terrain)
    estimatedDuration: f64, // seconds (Naismith hiking function estimate)
    maxCompletionTime: ?i64, // seconds allowed (endTime - startTime), null if absent
};

/// Compute section statistics between consecutive section-boundary waypoints
/// (Start/TimeBarrier/LifeBase/Arrival). Returns null when fewer than 2 section boundaries.
pub fn computeFromWaypoints(trace: *const Trace, allocator: std.mem.Allocator, waypoints: []const Waypoint) !?[]SectionStats {
    // Collect section-boundary waypoints (those with a non-null wptType)
    var section_wpts = std.ArrayList(Waypoint){};
    defer section_wpts.deinit(allocator);

    for (waypoints) |wpt| {
        if (wpt.isSectionBoundary()) {
            try section_wpts.append(allocator, wpt);
        }
    }

    if (section_wpts.items.len < 2) {
        return null;
    }

    const num_sections = section_wpts.items.len - 1;
    var sections = std.ArrayList(SectionStats){};
    errdefer sections.deinit(allocator);

    var search_start: usize = 0;

    // Track which stage each section belongs to.
    // Increments each time a stage-boundary waypoint (isStageBoundary) is encountered
    // after the first one.
    var current_stage_idx: usize = 0;
    var stage_active: bool = false;

    for (0..num_sections) |i| {
        if (section_wpts.items[i].isStageBoundary()) {
            if (stage_active) {
                current_stage_idx += 1;
            } else {
                stage_active = true;
            }
        }
        const start_wpt = section_wpts.items[i];
        const end_wpt = section_wpts.items[i + 1];

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

        for (start_index..end_index) |j| {
            const ele = trace.points[j][2];
            min_elevation = @min(min_elevation, ele);
            max_elevation = @max(max_elevation, ele);
            max_slope = @max(max_slope, @abs(trace.slopes[j]));
        }

        const avg_slope = if (dist > 0) ((elevation_gain - elevation_loss) / dist) * 100.0 else 0.0;

        const dist_km = dist / 1000.0;
        const flat_time = dist_km / 5.0;
        const naismith_time = flat_time + elevation_gain / 600.0;
        const estimated_duration = naismith_time * 3600.0;
        const effort_ratio = if (flat_time > 0) naismith_time / flat_time else 1.0;
        const difficulty: u8 = if (effort_ratio < 1.2) 1 else if (effort_ratio < 1.5) 2 else if (effort_ratio < 2.0) 3 else if (effort_ratio < 2.7) 4 else 5;

        const point_count = end_index - start_index + 1;

        sections.append(allocator, SectionStats{
            .sectionId = i,
            .stageIdx = current_stage_idx,
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
            .maxCompletionTime = if (start_wpt.time != null and end_wpt.time != null)
                end_wpt.time.? - start_wpt.time.?
            else
                null,
        }) catch |err| return err;
    }

    return try sections.toOwnedSlice(allocator);
}

test "computeSectionsFromWaypoints: returns null with no section boundaries" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 110.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "A", .time = null },
        .{ .lat = 0.001, .lon = 0.0, .name = "B", .time = null },
    };
    const result = try computeFromWaypoints(&trace, allocator, &waypoints);
    try std.testing.expect(result == null);
}

test "computeSectionsFromWaypoints: returns null with only one section boundary" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 110.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.001, .lon = 0.0, .name = "Plain", .time = null },
    };
    const result = try computeFromWaypoints(&trace, allocator, &waypoints);
    try std.testing.expect(result == null);
}

test "computeSectionsFromWaypoints: basic two-boundary section" {
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",       .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "TB1",     .wptType = "TimeBarrier", .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (sections) |s| allocator.free(s);

    try std.testing.expect(sections != null);
    try std.testing.expectEqual(@as(usize, 1), sections.?.len);
    try std.testing.expectEqual(@as(usize, 0), sections.?[0].sectionId);
    try std.testing.expect(sections.?[0].totalDistance > 0.0);
    try std.testing.expect(sections.?[0].pointCount > 0);
}

test "computeSectionsFromWaypoints: plain (untyped) waypoints are ignored" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 102.0 },
        [3]f64{ 0.002, 0.0, 104.0 },
        [3]f64{ 0.003, 0.0, 106.0 },
        [3]f64{ 0.004, 0.0, 108.0 },
        [3]f64{ 0.005, 0.0, 110.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    // 3 section boundaries with plain waypoints interspersed
    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",  .wptType = "Start",       .time = null },
        .{ .lat = 0.001, .lon = 0.0, .name = "Plain1", .wptType = null,           .time = null },
        .{ .lat = 0.002, .lon = 0.0, .name = "TB1",    .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "Plain2", .wptType = null,           .time = null },
        .{ .lat = 0.005, .lon = 0.0, .name = "End",    .wptType = "Arrival",     .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (sections) |s| allocator.free(s);

    // 2 sections: Start→TB1 and TB1→Arrival; plain waypoints are skipped
    try std.testing.expect(sections != null);
    try std.testing.expectEqual(@as(usize, 2), sections.?.len);
}

test "computeSectionsFromWaypoints: stageIdx increments at LifeBase boundary" {
    const allocator = std.testing.allocator;
    var points = try allocator.alloc([3]f64, 12);
    defer allocator.free(points);
    for (0..12) |i| {
        const t = @as(f64, @floatFromInt(i)) * 0.001;
        points[i] = [3]f64{ t, 0.0, 100.0 + t * 500.0 };
    }
    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    // Sections: Start→TB1→LifeBase→TB2→Arrival
    // Stage 0: Start→TB1, TB1→LifeBase  (sections 0 and 1)
    // Stage 1: LifeBase→TB2, TB2→Arrival (sections 2 and 3)
    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",       .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "TB1",     .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.006, .lon = 0.0, .name = "LB1",     .wptType = "LifeBase",    .time = null },
        .{ .lat = 0.009, .lon = 0.0, .name = "TB2",     .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.011, .lon = 0.0, .name = "Arrival", .wptType = "Arrival",     .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (sections) |s| allocator.free(s);

    try std.testing.expect(sections != null);
    try std.testing.expectEqual(@as(usize, 4), sections.?.len);
    // Sections 0 and 1 belong to stage 0 (before LifeBase)
    try std.testing.expectEqual(@as(usize, 0), sections.?[0].stageIdx);
    try std.testing.expectEqual(@as(usize, 0), sections.?[1].stageIdx);
    // Sections 2 and 3 belong to stage 1 (after LifeBase)
    try std.testing.expectEqual(@as(usize, 1), sections.?[2].stageIdx);
    try std.testing.expectEqual(@as(usize, 1), sections.?[3].stageIdx);
}

test "computeSectionsFromWaypoints: maxCompletionTime computed from timestamps" {
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start",       .time = 1_000_000 },
        .{ .lat = 0.003, .lon = 0.0, .name = "End",   .wptType = "TimeBarrier", .time = 1_007_200 },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (sections) |s| allocator.free(s);

    try std.testing.expect(sections != null);
    try std.testing.expectEqual(@as(usize, 1), sections.?.len);
    try std.testing.expect(sections.?[0].maxCompletionTime != null);
    try std.testing.expectEqual(@as(i64, 7200), sections.?[0].maxCompletionTime.?);
    try std.testing.expectEqual(@as(i64, 1_000_000), sections.?[0].startTime.?);
    try std.testing.expectEqual(@as(i64, 1_007_200), sections.?[0].endTime.?);
}

test "computeSectionsFromWaypoints: maxCompletionTime is null without timestamps" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 105.0 },
        [3]f64{ 0.002, 0.0, 110.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start",   .time = null },
        .{ .lat = 0.002, .lon = 0.0, .name = "End",   .wptType = "Arrival", .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints);
    defer if (sections) |s| allocator.free(s);

    try std.testing.expect(sections != null);
    try std.testing.expectEqual(@as(?i64, null), sections.?[0].maxCompletionTime);
    try std.testing.expectEqual(@as(?i64, null), sections.?[0].startTime);
    try std.testing.expectEqual(@as(?i64, null), sections.?[0].endTime);
}
