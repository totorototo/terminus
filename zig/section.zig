const std = @import("std");
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const paceModel = @import("paceModel.zig");
const calibration = @import("calibration.zig");

/// Interval between two consecutive section-boundary waypoints (Start/TimeBarrier/LifeBase/Arrival).
/// Has timing info (cutoffs). Belongs to a stage (stageIdx).
/// Field list lives in `calibration.CommonIntervalStats` + `calibration.WithIds`,
/// shared with StageStats so the two can't drift out of sync.
pub const SectionStats = calibration.SectionStats;

/// Compute section statistics between consecutive section-boundary waypoints
/// (Start/TimeBarrier/LifeBase/Arrival). Returns null when fewer than 2 section boundaries.
/// base_pace_s_per_km: flat-terrain pace in seconds per km (e.g. 490 = 8:10/km).
/// k_fatigue: cumulative fatigue coefficient (e.g. 0.004 for 200km+ ultra).
/// weather: forecast conditions keyed by checkpoint name; pass
/// `paceModel.WeatherLookup.empty` to leave estimates weather-neutral.
/// Thin section-granularity wrapper over `calibration.computeBoundaryStats`,
/// which holds the boundary resolution and physics shared with stages.
pub fn computeFromWaypoints(trace: *const Trace, allocator: std.mem.Allocator, waypoints: []const Waypoint, base_pace_s_per_km: f64, k_fatigue: f64, life_base_stop_s: u32, weather: paceModel.WeatherLookup) !?[]SectionStats {
    return calibration.computeBoundaryStats(SectionStats, .section, trace, allocator, waypoints, base_pace_s_per_km, k_fatigue, life_base_stop_s, weather);
}

// Live section recalibration lives in `calibration.zig`, shared with stages.
// `recalibrateFromCurrent` here is a thin section-granularity wrapper over it.

pub const Recalibration = calibration.Recalibration;
pub const RecalibratedSectionETA = calibration.RecalibratedETA;
pub const MIN_CALIBRATION_PREDICTION_S = calibration.MIN_CALIBRATION_PREDICTION_S;
pub const CALIBRATION_MIN = calibration.CALIBRATION_MIN;
pub const CALIBRATION_MAX = calibration.CALIBRATION_MAX;

/// Recalibrate remaining-section ETAs from the runner's live progress, splitting
/// on section boundaries (Start/TimeBarrier/LifeBase/Arrival).
/// See `calibration.recalibrateFromCurrent` for the full contract.
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
    return calibration.recalibrateFromCurrent(trace, allocator, waypoints, .section, current_index, actual_elapsed_s, base_pace_s_per_km, k_fatigue, life_base_stop_s, weather);
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
    const result = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
    const result = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "TB1", .wptType = "TimeBarrier", .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.001, .lon = 0.0, .name = "Plain1", .wptType = null, .time = null },
        .{ .lat = 0.002, .lon = 0.0, .name = "TB1", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "Plain2", .wptType = null, .time = null },
        .{ .lat = 0.005, .lon = 0.0, .name = "End", .wptType = "Arrival", .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "TB1", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.006, .lon = 0.0, .name = "LB1", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.009, .lon = 0.0, .name = "TB2", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.011, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = 1_000_000 },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .wptType = "TimeBarrier", .time = 1_007_200 },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.002, .lon = 0.0, .name = "End", .wptType = "Arrival", .time = null },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = 1_000_000 },
        .{ .lat = 0.003, .lon = 0.0, .name = "End", .wptType = "TimeBarrier", .time = 1_000_000 + 36_000 },
    };

    const sections = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.004, .lon = 0.0, .name = "LB", .wptType = "LifeBase", .time = null },
        .{ .lat = 0.008, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };
    const wpts_tb = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.004, .lon = 0.0, .name = "TB", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.008, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    // Pass 0 for life_base_stop_s: this test is about fatigue recovery, not stop time.
    const sections_lb = try computeFromWaypoints(&trace, allocator, &wpts_lb, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (sections_lb) |s| allocator.free(s);
    const sections_tb = try computeFromWaypoints(&trace, allocator, &wpts_tb, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = noon_utc },
        .{ .lat = 0.003, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };
    const wpts_night = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = night_utc },
        .{ .lat = 0.003, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const s_day = try computeFromWaypoints(&trace, allocator, &wpts_day, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
    defer if (s_day) |s| allocator.free(s);
    const s_night = try computeFromWaypoints(&trace, allocator, &wpts_night, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, paceModel.DEFAULT_LIFE_BASE_STOP_S, paceModel.WeatherLookup.empty);
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "LB", .wptType = "LifeBase", .time = null, .stopDuration = stop_secs },
    };
    const wpts_no_stop = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "LB", .wptType = "LifeBase", .time = null },
    };

    // Explicit stopDuration overrides the default; pass 0 as default for the no-stop baseline.
    const s_stop = try computeFromWaypoints(&trace, allocator, &wpts_stop, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (s_stop) |s| allocator.free(s);
    const s_no = try computeFromWaypoints(&trace, allocator, &wpts_no_stop, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
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

test "computeSectionsFromWaypoints: adverse weather at a checkpoint slows that section" {
    // Two identical single sections; the weather variant has a hot/wet forecast at
    // the arrival checkpoint, which must increase that section's estimated duration.
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
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.003, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const s_calm = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (s_calm) |s| allocator.free(s);

    const names = [_][]const u8{"Arrival"};
    const values = [_]paceModel.WeatherConditions{
        .{ .temperature_c = 32.0, .humidity_pct = 85.0, .wind_kmh = 35.0, .precip_prob_pct = 80.0 },
    };
    const lookup = paceModel.WeatherLookup{ .names = &names, .values = &values };
    const s_hot = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, lookup);
    defer if (s_hot) |s| allocator.free(s);

    try std.testing.expect(s_calm != null);
    try std.testing.expect(s_hot != null);
    try std.testing.expect(s_hot.?[0].estimatedDuration > s_calm.?[0].estimatedDuration);
    // A forecast keyed to a different checkpoint name must not change anything.
    const other_names = [_][]const u8{"Nowhere"};
    const other_lookup = paceModel.WeatherLookup{ .names = &other_names, .values = &values };
    const s_other = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, other_lookup);
    defer if (s_other) |s| allocator.free(s);
    try std.testing.expectApproxEqAbs(s_calm.?[0].estimatedDuration, s_other.?[0].estimatedDuration, 1e-6);
}

// ── recalibrateFromCurrent (section wrapper) ─────────────────────────────────
// The calibration physics are covered in calibration.zig. This integration test
// only verifies the section-granularity wrapper agrees with the a-priori model.

test "recalibrateFromCurrent: at the start reproduces the a-priori section total at factor 1.0" {
    const allocator = std.testing.allocator;
    var points = try allocator.alloc([3]f64, 30);
    defer allocator.free(points);
    for (0..30) |i| {
        points[i] = [3]f64{ @as(f64, @floatFromInt(i)) * 0.001, 0.0, 100.0 };
    }
    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    // Start(idx0) / TB1(idx10) / TB2(idx20) / Arrival(idx29) — three sections.
    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
        .{ .lat = 0.010, .lon = 0.0, .name = "TB1", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.020, .lon = 0.0, .name = "TB2", .wptType = "TimeBarrier", .time = null },
        .{ .lat = 0.029, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
    };

    const a_priori = try computeFromWaypoints(&trace, allocator, &waypoints, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (a_priori) |s| allocator.free(s);
    try std.testing.expect(a_priori != null);
    var a_total: f64 = 0.0;
    for (a_priori.?) |s| a_total += s.estimatedDuration;

    var result = try recalibrateFromCurrent(&trace, allocator, &waypoints, 0, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (result) |*r| r.deinit(allocator);
    try std.testing.expect(result != null);
    const r = result.?;

    try std.testing.expectEqual(@as(f64, 1.0), r.calibrationFactor);
    try std.testing.expectEqual(@as(usize, 3), r.etas.len);
    for (r.etas, 0..) |eta, i| {
        try std.testing.expectApproxEqAbs(a_priori.?[i].estimatedDuration, eta.remainingDurationS, 1e-6);
    }
    try std.testing.expectApproxEqAbs(a_total, r.etas[r.etas.len - 1].cumulativeRemainingS, 1e-6);
}
