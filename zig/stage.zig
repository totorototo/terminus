const std = @import("std");
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const bearingTo = @import("gpspoint.zig").bearingTo;
const paceModel = @import("paceModel.zig");
const segment = @import("segment.zig");
const calibration = @import("calibration.zig");

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
    estimatedDuration: f64, // seconds — moving time + planned stop at end checkpoint
    paceFactor: f64, // average Minetti pace factor relative to flat (1.0 = flat equivalent)
    maxCompletionTime: ?i64, // seconds allowed (endTime - startTime), null if absent
    cutoffRatio: ?f64, // estimatedDuration / maxCompletionTime; null if no cutoff; >1.0 means cutoff missed
    stopDuration: ?u32, // planned stop at the end checkpoint in seconds (from <stopDuration> in GPX), null if unset
};

/// Compute stage statistics between consecutive stage-boundary waypoints (Start/LifeBase/Arrival).
/// TimeBarrier waypoints are skipped — they only appear in sections, not stages.
/// base_pace_s_per_km: flat-terrain pace in seconds per km (e.g. 490 = 8:10/km).
/// k_fatigue: cumulative fatigue coefficient (e.g. 0.004 for 200km+ ultra).
/// weather: forecast conditions keyed by checkpoint name; pass
/// `paceModel.WeatherLookup.empty` to leave estimates weather-neutral.
pub fn computeFromWaypoints(trace: *const Trace, allocator: std.mem.Allocator, waypoints: []const Waypoint, base_pace_s_per_km: f64, k_fatigue: f64, life_base_stop_s: u32, weather: paceModel.WeatherLookup) !?[]StageStats {
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

    // Cumulative moving-time clock (s) for the circadian model, seeded from the
    // race start time. Kept in f64 and truncated only when read so total clock
    // drift stays sub-second across the whole race.
    const clock_start: ?i64 = stage_wpts.items[0].time;
    var elapsed_s: f64 = 0.0;

    for (0..num_stages) |i| {
        const start_wpt = stage_wpts.items[i];
        const end_wpt = stage_wpts.items[i + 1];

        const start_coord = [3]f64{ start_wpt.lat, start_wpt.lon, 0.0 };
        const end_coord = [3]f64{ end_wpt.lat, end_wpt.lon, 0.0 };

        const start_result = trace.findClosestPointAfter(start_coord, search_start) orelse continue;
        const end_result = trace.findClosestPointAfter(end_coord, start_result.index + 1) orelse continue;
        // Advance floor to the END of this stage so the next search does not snap to
        // an earlier (outbound) track occurrence of the shared boundary on loop courses.
        search_start = end_result.index;

        const bearing = bearingTo(start_coord, end_coord);

        const start_index = start_result.index;
        const end_index = end_result.index;

        if (start_index >= end_index) continue;

        const dist = trace.cumulativeDistances[end_index] - trace.cumulativeDistances[start_index];
        const elevation_gain = trace.cumulativeElevations[end_index] - trace.cumulativeElevations[start_index];
        const elevation_loss = trace.cumulativeElevationLoss[end_index] - trace.cumulativeElevationLoss[start_index];

        // Weather for this stage is the forecast at the checkpoint the runner is
        // heading to (the end waypoint). Unknown checkpoints resolve to neutral.
        const stage_weather = weather.find(end_wpt.name);

        const m = segment.computeSegmentMetrics(trace, start_index, end_index, base_pace_s_per_km, k_fatigue, clock_start, stage_weather, &d_eff, &elapsed_s);
        const min_elevation = m.minElevation;
        const max_elevation = m.maxElevation;
        const max_slope = m.maxSlope;
        const total_time = m.totalTime;
        const total_weighted_dist = m.totalWeightedDist;

        // LifeBase checkpoints mark a rest/resupply stop — shed 20% of accumulated fatigue.
        if (end_wpt.wptType) |t| {
            if (std.mem.eql(u8, t, "LifeBase")) {
                d_eff *= (1.0 - paceModel.RECOVERY_LIFE_BASE);
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
            .cutoffRatio = blk: {
                if (start_wpt.time == null or end_wpt.time == null) break :blk null;
                const mct = end_wpt.time.? - start_wpt.time.?;
                if (mct <= 0) break :blk null;
                break :blk estimated_duration / @as(f64, @floatFromInt(mct));
            },
            .stopDuration = end_wpt.stopDuration,
        }) catch |err| return err;
    }

    return try stages.toOwnedSlice(allocator);
}

// Live stage recalibration lives in `calibration.zig`, shared with sections.
// `recalibrateFromCurrent` here is a thin stage-granularity wrapper over it.

pub const Recalibration = calibration.Recalibration;
pub const RecalibratedStageETA = calibration.RecalibratedETA;

/// Recalibrate remaining-stage ETAs from the runner's live progress, splitting on
/// stage boundaries (Start/LifeBase/Arrival). TimeBarriers are ignored — they
/// only split sections. See `calibration.recalibrateFromCurrent` for the full
/// contract.
pub fn recalibrateFromCurrent(
    trace: *const Trace,
    allocator: std.mem.Allocator,
    waypoints: []const Waypoint,
    current_index: usize,
    actual_elapsed_s: f64,
    base_pace_s_per_km: f64,
    k_fatigue: f64,
    life_base_stop_s: u32,
    weather: paceModel.WeatherLookup,
) !?Recalibration {
    return calibration.recalibrateFromCurrent(trace, allocator, waypoints, .stage, current_index, actual_elapsed_s, base_pace_s_per_km, k_fatigue, life_base_stop_s, weather);
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
    try expect((try computeFromWaypoints(&trace, allocator, &waypoints_none, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty)) == null);

    // Only one stage boundary (Start)
    const waypoints_one = [_]Waypoint{
        .{ .lat = 0.0, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.001, .lon = 0.0, .name = "Plain", .time = null },
    };
    try expect((try computeFromWaypoints(&trace, allocator, &waypoints_one, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty)) == null);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.002, .lon = 0.0, .name = "TB1", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.005, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.005, .lon = 0.0, .name = "LifeBase", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.009, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = 1_000_000 },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .wptType = "Arrival", .time = 1_003_600 },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .wptType = "Arrival", .time = null },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
    defer if (stages) |st| allocator.free(st);

    try expect(stages != null);
    try expectEqual(@as(usize, 1), stages.?.len);
    try expectEqual(@as(?i64, null), stages.?[0].maxCompletionTime);
    try expectEqual(@as(?f64, null), stages.?[0].cutoffRatio);
}

test "stage cutoffRatio is estimatedDuration / maxCompletionTime" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.000, 0.0, 100.0 },
        [3]f64{ 0.001, 0.0, 100.0 },
        [3]f64{ 0.002, 0.0, 100.0 },
        [3]f64{ 0.003, 0.0, 100.0 },
    };

    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = 1_000_000 },
        .{ .lat = 0.003, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = 1_000_000 + 36_000 },
    };

    const stages = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
    defer if (stages) |st| allocator.free(st);

    try expect(stages != null);
    const st = stages.?[0];
    try expect(st.cutoffRatio != null);
    try std.testing.expectApproxEqAbs(
        st.estimatedDuration / 36_000.0,
        st.cutoffRatio.?,
        1e-9,
    );
    try expect(st.cutoffRatio.? < 1.0);
}

// ── recalibrateFromCurrent (stage wrapper) ───────────────────────────────────
// The calibration physics are covered in calibration.zig. These integration
// tests verify the stage-granularity wrapper: it splits on Start/LifeBase/Arrival
// (ignoring TimeBarriers) and agrees with the a-priori stage model.

test "recalibrateFromCurrent: stage wrapper at the start reproduces the a-priori stage total" {
    const allocator = std.testing.allocator;
    var points = try allocator.alloc([3]f64, 30);
    defer allocator.free(points);
    for (0..30) |i| {
        points[i] = [3]f64{ @as(f64, @floatFromInt(i)) * 0.001, 0.0, 100.0 };
    }
    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    // Start(idx0) / TB1(idx5) / LB1(idx10) / LB2(idx20) / Arrival(idx29).
    // As stages the TimeBarrier is ignored -> 3 stages.
    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.005, .lon = 0.0, .name = "TB1", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.010, .lon = 0.0, .name = "LB1", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.020, .lon = 0.0, .name = "LB2", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.029, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const a_priori = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (a_priori) |s| allocator.free(s);
    try expect(a_priori != null);
    try expectEqual(@as(usize, 3), a_priori.?.len);
    var a_total: f64 = 0.0;
    for (a_priori.?) |s| a_total += s.estimatedDuration;

    var result = try recalibrateFromCurrent(&trace, allocator, &waypoints, 0, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (result) |*r| r.deinit(allocator);
    try expect(result != null);
    const r = result.?;

    try expectEqual(@as(f64, 1.0), r.calibrationFactor);
    try expectEqual(@as(usize, 3), r.etas.len); // TimeBarrier ignored
    for (r.etas, 0..) |eta, i| {
        try std.testing.expectApproxEqAbs(a_priori.?[i].estimatedDuration, eta.remainingDurationS, 1e-6);
    }
    try std.testing.expectApproxEqAbs(a_total, r.etas[r.etas.len - 1].cumulativeRemainingS, 1e-6);
}

test "recalibrateFromCurrent: stage wrapper solves a factor and zeroes completed stages" {
    const allocator = std.testing.allocator;
    var points = try allocator.alloc([3]f64, 30);
    defer allocator.free(points);
    for (0..30) |i| {
        points[i] = [3]f64{ @as(f64, @floatFromInt(i)) * 0.001, 0.0, 100.0 };
    }
    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.010, .lon = 0.0, .name = "LB1", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.020, .lon = 0.0, .name = "LB2", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.029, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    // Runner reached LB1 (idx 10, end of stage 0) slower than predicted.
    var result = try recalibrateFromCurrent(&trace, allocator, &waypoints, 10, 900.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (result) |*r| r.deinit(allocator);
    try expect(result != null);
    const r = result.?;

    try expectEqual(@as(usize, 3), r.etas.len);
    try expect(r.calibrationFactor > 1.0);
    try expectEqual(@as(f64, 0.0), r.etas[0].remainingDurationS);
    try expect(r.etas[1].remainingDurationS > 0.0);
    try expect(r.etas[2].cumulativeRemainingS > r.etas[1].cumulativeRemainingS);
}
