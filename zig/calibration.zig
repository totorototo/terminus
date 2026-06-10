const std = @import("std");
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const paceModel = @import("paceModel.zig");
const segment = @import("segment.zig");

// ──────────────────────────────────────────────────────────────────────────────
// Live recalibration (shared by section.zig and stage.zig)
// ──────────────────────────────────────────────────────────────────────────────
//
// Where computeFromWaypoints predicts once at file load, `recalibrateFromCurrent`
// solves the base pace that reproduces the runner's real elapsed time mid-race,
// then forward-predicts the remaining intervals with it. Only the flat-pace anchor
// moves; slope/fatigue/weather structure and per-range physics are reused from
// `segment.computeSegmentMetrics`, and the circadian clock is re-seeded from real
// elapsed time so the night-time slowdown lands at the right wall-clock hours.
//
// Sections and stages differ only in WHICH waypoints are boundaries (TimeBarriers
// split sections, not stages) — captured by `BoundaryKind`, so the physics live
// here once. Legs are excluded: no boundary type, no cutoff anchor.

/// Calibration is ignored until the model predicts at least this many seconds of
/// covered effort — below it the actual/predicted ratio is GPS-noise dominated.
pub const MIN_CALIBRATION_PREDICTION_S: f64 = 300.0;

/// Calibration factor is clamped to this range so a single bad GPS sample (or a
/// long unplanned stop) can't produce an absurd ETA.
pub const CALIBRATION_MIN: f64 = 0.5;
pub const CALIBRATION_MAX: f64 = 3.0;

/// Which set of boundary waypoints to recalibrate against.
/// Sections split on Start/TimeBarrier/LifeBase/Arrival (checkpoint granularity);
/// stages split on Start/LifeBase/Arrival (life-base granularity).
pub const BoundaryKind = enum { section, stage };

fn isBoundary(wpt: Waypoint, kind: BoundaryKind) bool {
    return switch (kind) {
        .section => wpt.isSectionBoundary(),
        .stage => wpt.isStageBoundary(),
    };
}

/// Recalibrated ETA for one interval (section or stage), relative to the runner's
/// current position.
pub const RecalibratedETA = struct {
    /// Position of this interval in race order (its section id or stage id).
    id: usize,
    endIndex: usize,
    /// Remaining moving+stop time still to be run within this interval (seconds).
    /// 0 for intervals the runner has already completed.
    remainingDurationS: f64,
    /// Seconds from the runner's current position to the END of this interval,
    /// i.e. the running sum of `remainingDurationS` over this and prior intervals.
    /// 0 for already-completed intervals.
    cumulativeRemainingS: f64,
};

/// Result of a live recalibration. Caller owns `etas`.
pub const Recalibration = struct {
    /// actualElapsed / predictedSoFar (moving time), clamped and gated; 1.0 when
    /// not yet trusted.
    calibrationFactor: f64,
    /// base pace × calibrationFactor — the pace used to forward-predict.
    calibratedBasePaceSPerKm: f64,
    /// Model's moving-time prediction for the covered distance, at the original pace.
    predictedSoFarS: f64,
    /// Runner's actual elapsed seconds, as supplied by the caller.
    actualElapsedS: f64,
    etas: []RecalibratedETA,

    pub fn deinit(self: *Recalibration, allocator: std.mem.Allocator) void {
        if (self.etas.len != 0) allocator.free(self.etas);
    }
};

/// One interval's resolved track range plus the end waypoint needed for weather,
/// LifeBase recovery and planned-stop lookups.
const ResolvedRange = struct {
    id: usize,
    start_index: usize,
    end_index: usize,
    end_wpt: Waypoint,
};

/// Advance the physiological model across `[from, end)` of an interval at `pace`,
/// mutating carried fatigue (`d_eff`) and circadian (`elapsed_s`) state. Returns
/// the segment's moving time. When `apply_end_effects` is true (runner reaches the
/// checkpoint), applies LifeBase fatigue recovery and returns the planned stop in
/// `stop_out`; otherwise leaves both untouched.
fn advanceRange(
    trace: *const Trace,
    rs: ResolvedRange,
    from: usize,
    end: usize,
    pace_s_per_km: f64,
    k_fatigue: f64,
    clock_start: ?i64,
    life_base_stop_s: u32,
    weather: paceModel.WeatherLookup,
    apply_end_effects: bool,
    d_eff: *f64,
    elapsed_s: *f64,
    stop_out: *f64,
) f64 {
    const range_weather = weather.find(rs.end_wpt.name);
    const m = segment.computeSegmentMetrics(trace, from, end, pace_s_per_km, k_fatigue, clock_start, range_weather, d_eff, elapsed_s);

    stop_out.* = 0.0;
    if (apply_end_effects) {
        if (rs.end_wpt.wptType) |t| {
            if (std.mem.eql(u8, t, "LifeBase")) {
                d_eff.* *= (1.0 - paceModel.RECOVERY_LIFE_BASE);
            }
        }
        stop_out.* = blk: {
            if (rs.end_wpt.stopDuration) |sd| break :blk @as(f64, @floatFromInt(sd));
            if (rs.end_wpt.wptType) |t| {
                if (std.mem.eql(u8, t, "LifeBase")) break :blk @as(f64, @floatFromInt(life_base_stop_s));
            }
            break :blk 0.0;
        };
    }
    return m.totalTime;
}

/// Recalibrate remaining-interval ETAs from the runner's live progress.
///
/// `kind` selects section- vs stage-granularity boundaries. `current_index` is the
/// runner's current trace point; `actual_elapsed_s` is the real seconds elapsed
/// since the race start. The function replays the covered intervals at the
/// original `base_pace_s_per_km` to obtain the model's moving-time prediction so
/// far, solves the calibration factor (actual / predicted, gated + clamped), then
/// forward-predicts the remaining intervals at the calibrated pace with the
/// circadian clock re-seeded to `actual_elapsed_s`.
///
/// Returns null when there are fewer than 2 boundaries. Caller owns `result.etas`.
pub fn recalibrateFromCurrent(
    trace: *const Trace,
    allocator: std.mem.Allocator,
    waypoints: []const Waypoint,
    kind: BoundaryKind,
    current_index: usize,
    actual_elapsed_s: f64,
    base_pace_s_per_km: f64,
    k_fatigue: f64,
    life_base_stop_s: u32,
    weather: paceModel.WeatherLookup,
) !?Recalibration {
    // ── Resolve boundary waypoints onto trace index ranges ─────────────────────
    var boundary_wpts = std.ArrayList(Waypoint){};
    defer boundary_wpts.deinit(allocator);
    for (waypoints) |wpt| {
        if (isBoundary(wpt, kind)) try boundary_wpts.append(allocator, wpt);
    }
    if (boundary_wpts.items.len < 2) return null;

    const num_ranges = boundary_wpts.items.len - 1;
    var resolved = std.ArrayList(ResolvedRange){};
    defer resolved.deinit(allocator);

    var search_start: usize = 0;
    for (0..num_ranges) |i| {
        const start_wpt = boundary_wpts.items[i];
        const end_wpt = boundary_wpts.items[i + 1];
        const start_coord = [3]f64{ start_wpt.lat, start_wpt.lon, 0.0 };
        const end_coord = [3]f64{ end_wpt.lat, end_wpt.lon, 0.0 };
        const start_result = trace.findClosestPointAfter(start_coord, search_start) orelse continue;
        const end_result = trace.findClosestPointAfter(end_coord, start_result.index + 1) orelse continue;
        search_start = end_result.index;
        if (start_result.index >= end_result.index) continue;
        try resolved.append(allocator, .{
            .id = i,
            .start_index = start_result.index,
            .end_index = end_result.index,
            .end_wpt = end_wpt,
        });
    }

    const clock_start: ?i64 = boundary_wpts.items[0].time;

    // ── Phase 1: replay covered intervals at the ORIGINAL pace ─────────────────
    // Accumulate the model's moving-time prediction for the distance already
    // covered, carrying fatigue (d_eff) and clock state. The interval containing
    // the runner is advanced only up to `current_index`.
    var d_eff: f64 = 0.0;
    var elapsed_s: f64 = 0.0;
    var predicted_so_far: f64 = 0.0;
    // Planned stops at the life bases the runner has already passed. These are
    // part of `actual_elapsed_s` but not of the moving-time `predicted_so_far`, so
    // they are subtracted before solving the factor — rest must not move the pace.
    var predicted_stops_so_far: f64 = 0.0;
    var stop_scratch: f64 = 0.0;
    var current_range: usize = resolved.items.len; // default: past the end
    var found_current = false;

    for (resolved.items, 0..) |rs, idx| {
        if (current_index >= rs.end_index) {
            predicted_so_far += advanceRange(trace, rs, rs.start_index, rs.end_index, base_pace_s_per_km, k_fatigue, clock_start, life_base_stop_s, weather, true, &d_eff, &elapsed_s, &stop_scratch);
            predicted_stops_so_far += stop_scratch;
        } else {
            current_range = idx;
            found_current = true;
            if (current_index > rs.start_index) {
                predicted_so_far += advanceRange(trace, rs, rs.start_index, current_index, base_pace_s_per_km, k_fatigue, clock_start, life_base_stop_s, weather, false, &d_eff, &elapsed_s, &stop_scratch);
            }
            break;
        }
    }

    // ── Solve calibration ──────────────────────────────────────────────────────
    // Compare moving time to moving time: strip the planned stops already incurred
    // from the runner's elapsed so the factor reflects pace, not rest. (Resting
    // longer than planned still leaks into the factor — unavoidable without
    // separate stop tracking — but the planned portion is removed cleanly.)
    var calibration: f64 = 1.0;
    const moving_elapsed_s = actual_elapsed_s - predicted_stops_so_far;
    if (moving_elapsed_s > 0 and predicted_so_far >= MIN_CALIBRATION_PREDICTION_S) {
        calibration = std.math.clamp(moving_elapsed_s / predicted_so_far, CALIBRATION_MIN, CALIBRATION_MAX);
    }
    const calibrated_pace = base_pace_s_per_km * calibration;

    // ── Phase 2: forward-predict remaining intervals at the calibrated pace ─────
    // Re-seed the circadian clock to the runner's REAL elapsed time so the
    // night-time slowdown lands at the correct wall-clock hours. Fatigue carries
    // over from the covered portion unchanged.
    elapsed_s = actual_elapsed_s;

    var etas = try allocator.alloc(RecalibratedETA, resolved.items.len);
    errdefer allocator.free(etas);

    var cumulative: f64 = 0.0;
    for (resolved.items, 0..) |rs, idx| {
        var remaining: f64 = 0.0;
        const is_remaining = idx > current_range or (idx == current_range and found_current);
        if (is_remaining) {
            const from = if (idx == current_range and current_index > rs.start_index) current_index else rs.start_index;
            var stop_secs: f64 = 0.0;
            const moving = advanceRange(trace, rs, from, rs.end_index, calibrated_pace, k_fatigue, clock_start, life_base_stop_s, weather, true, &d_eff, &elapsed_s, &stop_secs);
            remaining = moving + stop_secs;
            cumulative += remaining;
        }
        etas[idx] = .{
            .id = rs.id,
            .endIndex = rs.end_index,
            .remainingDurationS = remaining,
            .cumulativeRemainingS = if (remaining > 0) cumulative else 0.0,
        };
    }

    return Recalibration{
        .calibrationFactor = calibration,
        .calibratedBasePaceSPerKm = calibrated_pace,
        .predictedSoFarS = predicted_so_far,
        .actualElapsedS = actual_elapsed_s,
        .etas = etas,
    };
}

// ── Tests ───────────────────────────────────────────────────────────────────

/// Flat 30-point test route. Trace owns its own copy, so the temporary points
/// buffer is freed here; caller defers `trace.deinit(allocator)`.
fn buildRecalRoute(allocator: std.mem.Allocator) !Trace {
    var points = try allocator.alloc([3]f64, 30);
    defer allocator.free(points);
    for (0..30) |i| {
        points[i] = [3]f64{ @as(f64, @floatFromInt(i)) * 0.001, 0.0, 100.0 };
    }
    return try Trace.init(allocator, points);
}

/// Shared boundaries: Start(idx0) / TB1(idx5) / LB1(idx10) / LB2(idx20) /
/// Arrival(idx29). As sections that is 4 ranges; as stages the TimeBarrier is
/// ignored, leaving 3 ranges (Start→LB1→LB2→Arrival).
const recal_waypoints = [_]Waypoint{
    .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
    .{ .lat = 0.005, .lon = 0.0, .name = "TB1", .wptType = "TimeBarrier", .time = null },
    .{ .lat = 0.010, .lon = 0.0, .name = "LB1", .wptType = "LifeBase", .time = null },
    .{ .lat = 0.020, .lon = 0.0, .name = "LB2", .wptType = "LifeBase", .time = null },
    .{ .lat = 0.029, .lon = 0.0, .name = "Arrival", .wptType = "Arrival", .time = null },
};

test "recalibrateFromCurrent: returns null with fewer than 2 boundaries" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    const waypoints = [_]Waypoint{
        .{ .lat = 0.000, .lon = 0.0, .name = "Start", .wptType = "Start", .time = null },
    };
    const result = try recalibrateFromCurrent(&trace, allocator, &waypoints, .section, 0, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    try std.testing.expect(result == null);
}

test "recalibrateFromCurrent: no elapsed keeps factor 1.0 and a coherent cumulative" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    var result = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 0, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (result) |*r| r.deinit(allocator);
    try std.testing.expect(result != null);
    const r = result.?;

    // No elapsed time -> calibration is not yet trusted -> stays at 1.0.
    try std.testing.expectEqual(@as(f64, 1.0), r.calibrationFactor);
    try std.testing.expectEqual(paceModel.DEFAULT_BASE_PACE_S_PER_KM, r.calibratedBasePaceSPerKm);
    try std.testing.expectEqual(@as(usize, 4), r.etas.len); // 4 sections

    // Final cumulative is the sum of all per-interval remainings.
    var sum: f64 = 0.0;
    for (r.etas) |eta| {
        try std.testing.expect(eta.remainingDurationS > 0.0);
        sum += eta.remainingDurationS;
    }
    try std.testing.expectApproxEqAbs(sum, r.etas[r.etas.len - 1].cumulativeRemainingS, 1e-6);
}

test "recalibrateFromCurrent: solves the clamped factor from actual vs predicted" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    // Runner reached LB1 (idx 10) but took longer than predicted.
    var result = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 10, 900.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (result) |*r| r.deinit(allocator);
    try std.testing.expect(result != null);
    const r = result.?;

    try std.testing.expect(r.predictedSoFarS >= MIN_CALIBRATION_PREDICTION_S);
    const expected = std.math.clamp(r.actualElapsedS / r.predictedSoFarS, CALIBRATION_MIN, CALIBRATION_MAX);
    try std.testing.expectApproxEqAbs(expected, r.calibrationFactor, 1e-9);
    // Slower-than-predicted -> factor > 1.
    try std.testing.expect(r.calibrationFactor > 1.0);
    try std.testing.expectApproxEqAbs(paceModel.DEFAULT_BASE_PACE_S_PER_KM * r.calibrationFactor, r.calibratedBasePaceSPerKm, 1e-9);
}

test "recalibrateFromCurrent: a slower runner gets longer remaining ETAs than a faster one" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    var fast = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 10, 300.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (fast) |*r| r.deinit(allocator);
    var slow = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 10, 1200.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (slow) |*r| r.deinit(allocator);

    try std.testing.expect(fast != null and slow != null);
    try std.testing.expect(slow.?.calibrationFactor > fast.?.calibrationFactor);
    const fast_total = fast.?.etas[fast.?.etas.len - 1].cumulativeRemainingS;
    const slow_total = slow.?.etas[slow.?.etas.len - 1].cumulativeRemainingS;
    try std.testing.expect(slow_total > fast_total);
}

test "recalibrateFromCurrent: completed intervals report zero remaining and cumulative is monotonic" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    // Runner is mid section 2 (idx 15): sections 0 and 1 are fully behind.
    var result = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 15, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (result) |*r| r.deinit(allocator);
    try std.testing.expect(result != null);
    const r = result.?;
    try std.testing.expectEqual(@as(usize, 4), r.etas.len);

    // Completed sections report zero.
    try std.testing.expectEqual(@as(f64, 0.0), r.etas[0].remainingDurationS);
    try std.testing.expectEqual(@as(f64, 0.0), r.etas[0].cumulativeRemainingS);
    try std.testing.expectEqual(@as(f64, 0.0), r.etas[1].remainingDurationS);
    // Remaining sections are positive and the cumulative strictly increases.
    try std.testing.expect(r.etas[2].remainingDurationS > 0.0);
    try std.testing.expect(r.etas[3].remainingDurationS > 0.0);
    try std.testing.expect(r.etas[3].cumulativeRemainingS > r.etas[2].cumulativeRemainingS);
}

test "recalibrateFromCurrent: a partly run interval costs less than running it from its start" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    // At LB1 (idx 10), section 2 (idx 10->20) is run in full.
    var at_start = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 10, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (at_start) |*r| r.deinit(allocator);
    // Mid section 2 (idx 15), only idx 15->20 remains.
    var mid = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 15, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (mid) |*r| r.deinit(allocator);

    try std.testing.expect(at_start != null and mid != null);
    try std.testing.expectEqual(@as(f64, 1.0), mid.?.calibrationFactor);
    // Section index 2 is the one containing idx 10..20.
    try std.testing.expect(mid.?.etas[2].remainingDurationS < at_start.?.etas[2].remainingDurationS);
    try std.testing.expect(mid.?.etas[2].remainingDurationS > 0.0);
}

test "recalibrateFromCurrent: a planned stop at a passed life base does not move the calibration factor" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    // Runner is mid section 2 (idx 15): section 1 ends at LB1, so its planned stop
    // is part of elapsed once a stop is configured. The factor must reflect pace
    // only, so adding the stop to both the model AND the elapsed time it accounts
    // for must leave the factor unchanged.
    const stop_s: u32 = 1800;
    const moving_elapsed: f64 = 1500.0;

    // No planned stop: elapsed is pure moving time.
    var no_stop = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 15, moving_elapsed, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (no_stop) |*r| r.deinit(allocator);
    // 30-min stop at LB1, and the runner spent it: elapsed = moving + stop.
    var with_stop = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 15, moving_elapsed + @as(f64, @floatFromInt(stop_s)), paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, stop_s, paceModel.WeatherLookup.empty);
    defer if (with_stop) |*r| r.deinit(allocator);

    try std.testing.expect(no_stop != null and with_stop != null);
    // Calibration actually engaged (not a trivial 1.0), so the equality is meaningful.
    try std.testing.expect(no_stop.?.calibrationFactor > 1.0);
    try std.testing.expect(no_stop.?.calibrationFactor < CALIBRATION_MAX);
    // The planned rest is stripped before solving -> identical pace factor.
    try std.testing.expectApproxEqAbs(no_stop.?.calibrationFactor, with_stop.?.calibrationFactor, 1e-9);
}

test "recalibrateFromCurrent: deinit is leak-clean" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    var result = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 12, 700.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    try std.testing.expect(result != null);
    result.?.deinit(allocator); // testing.allocator flags any leak or double-free
}

test "recalibrateFromCurrent: stage kind ignores TimeBarriers, section kind does not" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    // Same waypoints: 5 boundaries as sections (4 ranges), 4 as stages (3 ranges).
    var as_sections = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .section, 0, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (as_sections) |*r| r.deinit(allocator);
    var as_stages = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .stage, 0, 0.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (as_stages) |*r| r.deinit(allocator);

    try std.testing.expect(as_sections != null and as_stages != null);
    try std.testing.expectEqual(@as(usize, 4), as_sections.?.etas.len);
    try std.testing.expectEqual(@as(usize, 3), as_stages.?.etas.len);
    // Stage range 0 (Start->LB1) spans both section 0 (Start->TB1) and section 1
    // (TB1->LB1), so its remaining equals the sum of those two section remainings.
    const stage0 = as_stages.?.etas[0].remainingDurationS;
    const sec0_plus_1 = as_sections.?.etas[0].remainingDurationS + as_sections.?.etas[1].remainingDurationS;
    try std.testing.expectApproxEqAbs(sec0_plus_1, stage0, 1e-6);
}

test "recalibrateFromCurrent: stage kind solves a factor and forward-predicts" {
    const allocator = std.testing.allocator;
    var trace = try buildRecalRoute(allocator);
    defer trace.deinit(allocator);

    // Runner reached LB1 (idx 10) — the end of stage 0 — slower than predicted.
    var result = try recalibrateFromCurrent(&trace, allocator, &recal_waypoints, .stage, 10, 900.0, paceModel.DEFAULT_BASE_PACE_S_PER_KM, paceModel.K_FATIGUE, 0, paceModel.WeatherLookup.empty);
    defer if (result) |*r| r.deinit(allocator);
    try std.testing.expect(result != null);
    const r = result.?;

    try std.testing.expectEqual(@as(usize, 3), r.etas.len);
    try std.testing.expect(r.calibrationFactor > 1.0);
    // Stage 0 is complete -> zero remaining; stages 1 and 2 still ahead.
    try std.testing.expectEqual(@as(f64, 0.0), r.etas[0].remainingDurationS);
    try std.testing.expect(r.etas[1].remainingDurationS > 0.0);
    try std.testing.expect(r.etas[2].cumulativeRemainingS > r.etas[1].cumulativeRemainingS);
}
