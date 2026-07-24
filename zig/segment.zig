const std = @import("std");
const Trace = @import("trace.zig").Trace;
const paceModel = @import("paceModel.zig");

/// Per-point physiological metrics accumulated over a trace index range.
/// Shared by section.zig and stage.zig, which differ only in how they group
/// waypoints — the inner pace/fatigue/circadian/weather loop is identical.
pub const SegmentMetrics = struct {
    minElevation: f64,
    maxElevation: f64,
    maxSlope: f64, // percentage
    totalTime: f64, // seconds of moving time over this range
    totalWeightedDist: f64, // sum of seg_dist × paceFactor (for avg pace factor)
    totalCombinedWeightedDist: f64, // sum of seg_dist × combined factor (for avg effort factor)
};

/// Accumulate metrics over trace points `[start_index, end_index)`.
///
/// `d_eff_m` (cumulative effort-weighted distance, metres) and `elapsed_s`
/// (cumulative moving-time clock, seconds) are read and advanced in place so
/// the caller can carry fatigue and circadian state across consecutive segments.
/// `elapsed_s` stays in f64 and is only truncated when read for the circadian
/// model, keeping total clock drift sub-second across the whole race.
///
/// `clock_start` is the race start epoch (seconds) or null when no start time
/// is known, in which case the circadian factor is neutral (1.0).
///
/// `weather` is the forecast conditions for this segment (constant across the
/// range — one forecast per checkpoint). Pass `paceModel.WEATHER_NEUTRAL` when no
/// forecast is available, which leaves the estimate unchanged.
pub fn computeSegmentMetrics(
    trace: *const Trace,
    start_index: usize,
    end_index: usize,
    base_pace_s_per_km: f64,
    k_fatigue: f64,
    clock_start: ?i64,
    weather: paceModel.WeatherConditions,
    d_eff_m: *f64,
    elapsed_s: *f64,
) SegmentMetrics {
    var min_elevation = trace.points[start_index][2];
    var max_elevation = trace.points[start_index][2];
    var max_slope: f64 = 0.0;
    var total_time: f64 = 0.0;
    var total_weighted_dist: f64 = 0.0;
    var total_combined_weighted_dist: f64 = 0.0;

    // Weather is constant over the segment, so its multiplier is computed once.
    const weather_factor = paceModel.weatherFactor(weather);

    for (start_index..end_index) |j| {
        const ele = trace.points[j][2];
        min_elevation = @min(min_elevation, ele);
        max_elevation = @max(max_elevation, ele);
        max_slope = @max(max_slope, @abs(trace.slopes[j]));

        const slope_frac = trace.slopes[j] / 100.0;
        const seg_dist = trace.cumulativeDistances[j + 1] - trace.cumulativeDistances[j];
        const factors = paceModel.computeFactors(slope_frac, d_eff_m.* / 1000.0, k_fatigue, clock_start, elapsed_s.*, weather_factor);
        const seg_time = (seg_dist / 1000.0) * base_pace_s_per_km * factors.combined;

        total_time += seg_time;
        elapsed_s.* += seg_time;
        total_weighted_dist += seg_dist * factors.terrain;
        total_combined_weighted_dist += seg_dist * factors.combined;
        d_eff_m.* += seg_dist * factors.terrain;
    }

    return .{
        .minElevation = min_elevation,
        .maxElevation = max_elevation,
        .maxSlope = max_slope,
        .totalTime = total_time,
        .totalWeightedDist = total_weighted_dist,
        .totalCombinedWeightedDist = total_combined_weighted_dist,
    };
}

// ── Tests ────────────────────────────────────────────────────────────────────

test "computeSegmentMetrics: flat range has neutral pace factor and no fatigue growth" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        .{ 0.0, 0.000, 100.0 },
        .{ 0.0, 0.001, 100.0 },
        .{ 0.0, 0.002, 100.0 },
        .{ 0.0, 0.003, 100.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    var d_eff: f64 = 0.0;
    var elapsed: f64 = 0.0;
    const m = computeSegmentMetrics(&trace, 0, trace.points.len - 1, 500.0, paceModel.K_FATIGUE, null, paceModel.WEATHER_NEUTRAL, &d_eff, &elapsed);

    try std.testing.expectApproxEqAbs(100.0, m.minElevation, 0.001);
    try std.testing.expectApproxEqAbs(100.0, m.maxElevation, 0.001);
    // On flat terrain weighted distance equals raw distance (paceFactor == 1).
    try std.testing.expectApproxEqAbs(trace.cumulativeDistances[trace.points.len - 1], m.totalWeightedDist, 0.5);
    try std.testing.expect(m.totalTime > 0.0);
    try std.testing.expectApproxEqAbs(m.totalTime, elapsed, 1e-9);
}

test "computeSegmentMetrics: state carries across consecutive ranges" {
    const allocator = std.testing.allocator;
    var points = try allocator.alloc([3]f64, 20);
    defer allocator.free(points);
    for (0..20) |i| {
        const t = @as(f64, @floatFromInt(i)) / 20.0;
        points[i] = .{ 0.0, t * 0.01, 100.0 + t * 200.0 };
    }
    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    var d_eff: f64 = 0.0;
    var elapsed: f64 = 0.0;
    const last = trace.points.len - 1;
    const mid = last / 2;

    _ = computeSegmentMetrics(&trace, 0, mid, 500.0, paceModel.K_FATIGUE, null, paceModel.WEATHER_NEUTRAL, &d_eff, &elapsed);
    const d_after_first = d_eff;
    _ = computeSegmentMetrics(&trace, mid, last, 500.0, paceModel.K_FATIGUE, null, paceModel.WEATHER_NEUTRAL, &d_eff, &elapsed);

    // Effort distance and elapsed clock are cumulative, never reset between calls.
    try std.testing.expect(d_eff > d_after_first);
    try std.testing.expect(elapsed > 0.0);
}

test "computeSegmentMetrics: adverse weather increases segment time" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        .{ 0.0, 0.000, 100.0 },
        .{ 0.0, 0.001, 100.0 },
        .{ 0.0, 0.002, 100.0 },
        .{ 0.0, 0.003, 100.0 },
    };
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    const hot = paceModel.WeatherConditions{
        .temperature_c = 32.0,
        .humidity_pct = 85.0,
        .wind_kmh = 35.0,
        .precip_prob_pct = 80.0,
    };

    var d_eff_a: f64 = 0.0;
    var elapsed_a: f64 = 0.0;
    const neutral = computeSegmentMetrics(&trace, 0, trace.points.len - 1, 500.0, paceModel.K_FATIGUE, null, paceModel.WEATHER_NEUTRAL, &d_eff_a, &elapsed_a);

    var d_eff_b: f64 = 0.0;
    var elapsed_b: f64 = 0.0;
    const adverse = computeSegmentMetrics(&trace, 0, trace.points.len - 1, 500.0, paceModel.K_FATIGUE, null, hot, &d_eff_b, &elapsed_b);

    // Bad weather only slows: time goes up, by exactly the weather factor.
    try std.testing.expect(adverse.totalTime > neutral.totalTime);
    try std.testing.expectApproxEqAbs(
        neutral.totalTime * paceModel.weatherFactor(hot),
        adverse.totalTime,
        1e-6,
    );
    // Effort-weighted distance (terrain only) is unaffected by weather.
    try std.testing.expectApproxEqAbs(neutral.totalWeightedDist, adverse.totalWeightedDist, 1e-9);
}
