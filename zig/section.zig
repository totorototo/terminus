const std = @import("std");
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const bearingTo = @import("gpspoint.zig").bearingTo;
const minetti = @import("minetti.zig");

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
    difficulty: u8, // 1–5 (Minetti pace factor vs flat: <1.1→1, <1.4→2, <1.8→3, <2.5→4, ≥2.5→5)
    estimatedDuration: f64, // seconds — moving time + planned stop at end checkpoint
    paceFactor: f64, // average Minetti pace factor relative to flat (1.0 = flat equivalent)
    maxCompletionTime: ?i64, // seconds allowed (endTime - startTime), null if absent
    cutoffRatio: ?f64, // estimatedDuration / maxCompletionTime; null if no cutoff; >1.0 means cutoff missed
    stopDuration: ?u32, // planned stop at the end checkpoint in seconds (from <stopDuration> in GPX), null if unset
};

/// Compute section statistics between consecutive section-boundary waypoints
/// (Start/TimeBarrier/LifeBase/Arrival). Returns null when fewer than 2 section boundaries.
/// base_pace_s_per_km: flat-terrain pace in seconds per km (e.g. 490 = 8:10/km).
/// k_fatigue: cumulative fatigue coefficient (e.g. 0.004 for 200km+ ultra).
pub fn computeFromWaypoints(trace: *const Trace, allocator: std.mem.Allocator, waypoints: []const Waypoint, base_pace_s_per_km: f64, k_fatigue: f64, life_base_stop_s: u32) !?[]SectionStats {
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

    // Cumulative effort-weighted distance (m) for fatigue model.
    // Accumulates across all sections in race order so that later sections
    // reflect the physiological cost of prior effort.
    var d_eff: f64 = 0.0;

    // Running clock (Unix epoch seconds) for the circadian model.
    // Seeded from the race start waypoint's time if present; null otherwise.
    // Advanced per-segment by estimated travel time so that night sections
    // are penalised even when the actual waypoint cutoffs aren't used.
    var clock_s: ?i64 = section_wpts.items[0].time;

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
        // Advance floor to the END of this section so the next search does not snap to
        // an earlier (outbound) track occurrence of the shared boundary on loop courses.
        search_start = end_result.index;

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
            const fatigue_factor = minetti.fatigueFactor(d_eff / 1000.0, k_fatigue);
            const circadian = if (clock_s) |t| minetti.circadianFactor(t) else 1.0;
            const seg_time = (seg_dist / 1000.0) * base_pace_s_per_km * pf * fatigue_factor * circadian;
            total_time += seg_time;
            if (clock_s) |*t| t.* += @intFromFloat(seg_time);
            total_weighted_dist += seg_dist * pf;
            d_eff += seg_dist * pf;
        }

        // Partial recovery when the runner reaches a LifeBase checkpoint.
        if (end_wpt.wptType) |t| {
            if (std.mem.eql(u8, t, "LifeBase")) {
                d_eff *= (1.0 - minetti.RECOVERY_LIFE_BASE);
            }
        }

        const avg_slope = if (dist > 0) ((elevation_gain - elevation_loss) / dist) * 100.0 else 0.0;

        const avg_pf = if (dist > 0) total_weighted_dist / dist else 1.0;
        const stop_secs: f64 = blk: {
            if (end_wpt.stopDuration) |sd| break :blk @as(f64, @floatFromInt(sd));
            if (end_wpt.wptType) |t| {
                if (std.mem.eql(u8, t, "LifeBase")) break :blk @as(f64, @floatFromInt(life_base_stop_s));
            }
            break :blk 0.0;
        };
        const estimated_duration = total_time + stop_secs;
        const difficulty: u8 = if (avg_pf < 1.1) 1 else if (avg_pf < 1.4) 2 else if (avg_pf < 1.8) 3 else if (avg_pf < 2.5) 4 else 5;

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
            .paceFactor = avg_pf,
            .maxCompletionTime = if (start_wpt.time != null and end_wpt.time != null)
                end_wpt.time.? - start_wpt.time.?
            else
                null,
            .cutoffRatio = blk: {
                if (start_wpt.time == null or end_wpt.time == null) break :blk null;
                const mct = end_wpt.time.? - start_wpt.time.?;
                if (mct <= 0) break :blk null;
                break :blk estimated_duration / @as(f64, @floatFromInt(mct));
            },
            .stopDuration = end_wpt.stopDuration,
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
    const result = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
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
    const result = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
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

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
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

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
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

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
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

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
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

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
    defer if (sections) |s| allocator.free(s);

    try std.testing.expect(sections != null);
    try std.testing.expectEqual(@as(?i64, null), sections.?[0].maxCompletionTime);
    try std.testing.expectEqual(@as(?i64, null), sections.?[0].startTime);
    try std.testing.expectEqual(@as(?i64, null), sections.?[0].endTime);
    try std.testing.expectEqual(@as(?f64, null), sections.?[0].cutoffRatio);
}

test "computeSectionsFromWaypoints: cutoffRatio is estimatedDuration / maxCompletionTime" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 100.0 },
        [3]f64{ 0.002, 0.0, 100.0 },
        [3]f64{ 0.003, 0.0, 100.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    // Give a very generous cutoff (10 hours) so the ratio is clearly < 1.0
    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start",       .time = 1_000_000 },
        .{ .lat = 0.003, .lon = 0.0, .name = "End",   .wptType = "TimeBarrier", .time = 1_000_000 + 36_000 },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
    defer if (sections) |s| allocator.free(s);

    try std.testing.expect(sections != null);
    const s = sections.?[0];
    try std.testing.expect(s.cutoffRatio != null);
    // ratio = estimatedDuration / 36000
    try std.testing.expectApproxEqAbs(
        s.estimatedDuration / 36_000.0,
        s.cutoffRatio.?,
        1e-9,
    );
    // A few hundred metres at walking pace should be well under a 10-hour cutoff
    try std.testing.expect(s.cutoffRatio.? < 1.0);
}

test "computeSectionsFromWaypoints: LifeBase recovery reduces fatigue in subsequent section" {
    // Two identical legs. In the LifeBase variant the midpoint is a LifeBase (recovery applied);
    // in the TimeBarrier variant it is not. The second section should be faster with LifeBase.
    const allocator = std.testing.allocator;
    var points = try allocator.alloc([3]f64, 9);
    defer allocator.free(points);
    for (0..9) |i| {
        points[i] = [3]f64{ @as(f64, @floatFromInt(i)) * 0.001, 0.0, 100.0 };
    }

    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    const wpts_lb = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",       .time = null },
        .{ .lat = 0.004, .lon = 0.0, .name = "LB",      .wptType = "LifeBase",    .time = null },
        .{ .lat = 0.008, .lon = 0.0, .name = "Arrival", .wptType = "Arrival",     .time = null },
    };
    const wpts_tb = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",       .time = null },
        .{ .lat = 0.004, .lon = 0.0, .name = "TB",      .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.008, .lon = 0.0, .name = "Arrival", .wptType = "Arrival",     .time = null },
    };

    // Pass 0 for life_base_stop_s: this test is about fatigue recovery, not stop time.
    const sections_lb = try computeFromWaypoints(&trace, allocator, &wpts_lb, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, 0);
    defer if (sections_lb) |s| allocator.free(s);
    const sections_tb = try computeFromWaypoints(&trace, allocator, &wpts_tb, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, 0);
    defer if (sections_tb) |s| allocator.free(s);

    try std.testing.expect(sections_lb != null);
    try std.testing.expect(sections_tb != null);
    // First section is identical (same accumulated fatigue entering it, no stop time)
    try std.testing.expectApproxEqAbs(
        sections_lb.?[0].estimatedDuration,
        sections_tb.?[0].estimatedDuration,
        1e-6,
    );
    // Second section is faster with LifeBase recovery
    try std.testing.expect(sections_lb.?[1].estimatedDuration < sections_tb.?[1].estimatedDuration);
}

test "computeSectionsFromWaypoints: circadian penalty slows night sections" {
    // Same single-section route run twice: once starting at noon UTC, once at 3:30 UTC.
    // The night run should have a longer estimated duration.
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 100.0 },
        [3]f64{ 0.002, 0.0, 100.0 },
        [3]f64{ 0.003, 0.0, 100.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const noon_utc: i64 = 12 * 3600;
    const night_utc: i64 = 3 * 3600 + 30 * 60; // 03:30 UTC — circadian peak

    const wpts_day = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",   .time = noon_utc },
        .{ .lat = 0.003, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };
    const wpts_night = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start",   .wptType = "Start",   .time = night_utc },
        .{ .lat = 0.003, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const s_day = try computeFromWaypoints(&trace, allocator, &wpts_day, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
    defer if (s_day) |s| allocator.free(s);
    const s_night = try computeFromWaypoints(&trace, allocator, &wpts_night, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, minetti.DEFAULT_LIFE_BASE_STOP_S);
    defer if (s_night) |s| allocator.free(s);

    try std.testing.expect(s_day != null);
    try std.testing.expect(s_night != null);
    try std.testing.expect(s_night.?[0].estimatedDuration > s_day.?[0].estimatedDuration);
}

test "computeSectionsFromWaypoints: stopDuration is added to estimatedDuration" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 100.0 },
        [3]f64{ 0.002, 0.0, 100.0 },
        [3]f64{ 0.003, 0.0, 100.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const stop_secs: u32 = 3600; // 1 hour stop
    const wpts_stop = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start",    .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "LB",    .wptType = "LifeBase", .time = null, .stopDuration = stop_secs },
    };
    const wpts_no_stop = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start",    .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "LB",    .wptType = "LifeBase", .time = null },
    };

    // Explicit stopDuration overrides the default; pass 0 as default for the no-stop baseline.
    const s_stop = try computeFromWaypoints(&trace, allocator, &wpts_stop, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, 0);
    defer if (s_stop) |s| allocator.free(s);
    const s_no = try computeFromWaypoints(&trace, allocator, &wpts_no_stop, minetti.DEFAULT_BASE_PACE_S_PER_KM, minetti.K_FATIGUE, 0);
    defer if (s_no) |s| allocator.free(s);

    try std.testing.expect(s_stop != null);
    try std.testing.expect(s_no != null);
    // wpts_stop has explicit stopDuration=3600; wpts_no_stop has none and default=0
    try std.testing.expectApproxEqAbs(
        s_no.?[0].estimatedDuration + @as(f64, @floatFromInt(stop_secs)),
        s_stop.?[0].estimatedDuration,
        1e-6,
    );
    try std.testing.expectEqual(@as(?u32, stop_secs), s_stop.?[0].stopDuration);
    try std.testing.expectEqual(@as(?u32, null), s_no.?[0].stopDuration);
}
