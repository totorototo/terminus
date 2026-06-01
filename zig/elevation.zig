const std = @import("std");
const distance = @import("gpspoint.zig").distance;

pub const ELEV_NOISE_THRESHOLD_M: f64 = 3.0;
pub const ELEV_MEDIAN_RADIUS_M: f64 = 15.0;
const MAX_WINDOW_SAMPLES: usize = 256;

pub const GainLoss = struct {
    cumGain: []f64,
    cumLoss: []f64,
    totalGain: f64,
    totalLoss: f64,

    pub fn deinit(self: *GainLoss, allocator: std.mem.Allocator) void {
        if (self.cumGain.len != 0) allocator.free(self.cumGain);
        if (self.cumLoss.len != 0) allocator.free(self.cumLoss);
    }
};

pub fn cumulativeHorizontalDistance(allocator: std.mem.Allocator, points: []const [3]f64) ![]f64 {
    const cum = try allocator.alloc(f64, points.len);
    errdefer allocator.free(cum);
    if (points.len == 0) return cum;
    cum[0] = 0.0;
    var acc: f64 = 0.0;
    for (1..points.len) |i| {
        acc += distance(points[i - 1], points[i]);
        cum[i] = acc;
    }
    return cum;
}

fn median(scratch: []f64) f64 {
    std.mem.sort(f64, scratch, {}, std.sort.asc(f64));
    const n = scratch.len;
    if (n % 2 == 1) return scratch[n / 2];
    return (scratch[n / 2 - 1] + scratch[n / 2]) / 2.0;
}

pub fn medianSmooth(
    allocator: std.mem.Allocator,
    points: []const [3]f64,
    cum_dist: []const f64,
    radius_m: f64,
) ![]f64 {
    std.debug.assert(points.len == cum_dist.len);

    const out = try allocator.alloc(f64, points.len);
    errdefer allocator.free(out);
    if (points.len == 0) return out;

    const scratch = try allocator.alloc(f64, points.len);
    defer allocator.free(scratch);

    var lo: usize = 0;
    var hi: usize = 0;
    for (0..points.len) |i| {
        while (lo < i and cum_dist[i] - cum_dist[lo] > radius_m) lo += 1;
        while (hi + 1 < points.len and cum_dist[hi + 1] - cum_dist[i] <= radius_m) hi += 1;

        var win_lo = lo;
        var win_hi = hi;
        if (win_hi - win_lo + 1 > MAX_WINDOW_SAMPLES) {
            const half = MAX_WINDOW_SAMPLES / 2;
            win_lo = if (i > half) i - half else 0;
            win_hi = @min(win_lo + MAX_WINDOW_SAMPLES - 1, points.len - 1);
        }

        const count = win_hi - win_lo + 1;
        for (0..count) |k| scratch[k] = points[win_lo + k][2];
        out[i] = median(scratch[0..count]);
    }

    return out;
}

pub fn accumulate(
    allocator: std.mem.Allocator,
    elevations: []const f64,
    threshold_m: f64,
) !GainLoss {
    const cum_gain = try allocator.alloc(f64, elevations.len);
    errdefer allocator.free(cum_gain);
    const cum_loss = try allocator.alloc(f64, elevations.len);
    errdefer allocator.free(cum_loss);

    if (elevations.len == 0) {
        return GainLoss{ .cumGain = cum_gain, .cumLoss = cum_loss, .totalGain = 0.0, .totalLoss = 0.0 };
    }

    cum_gain[0] = 0.0;
    cum_loss[0] = 0.0;
    var gain: f64 = 0.0;
    var loss: f64 = 0.0;
    var ref = elevations[0];

    for (1..elevations.len) |i| {
        const e = elevations[i];
        if (e > ref + threshold_m) {
            gain += e - ref;
            ref = e;
        } else if (e < ref - threshold_m) {
            loss += ref - e;
            ref = e;
        }
        cum_gain[i] = gain;
        cum_loss[i] = loss;
    }

    return GainLoss{ .cumGain = cum_gain, .cumLoss = cum_loss, .totalGain = gain, .totalLoss = loss };
}

pub fn computeGainLoss(
    allocator: std.mem.Allocator,
    points: []const [3]f64,
    radius_m: f64,
    threshold_m: f64,
) !GainLoss {
    const cum_dist = try cumulativeHorizontalDistance(allocator, points);
    defer allocator.free(cum_dist);
    const smoothed = try medianSmooth(allocator, points, cum_dist, radius_m);
    defer allocator.free(smoothed);
    return accumulate(allocator, smoothed, threshold_m);
}

test "medianSmooth: rejects a single spike" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        .{ 0.0, 0.0000, 100.0 },
        .{ 0.0, 0.0001, 101.0 },
        .{ 0.0, 0.0002, 140.0 },
        .{ 0.0, 0.0003, 102.0 },
        .{ 0.0, 0.0004, 103.0 },
    };
    const cum = try cumulativeHorizontalDistance(allocator, &points);
    defer allocator.free(cum);
    const smoothed = try medianSmooth(allocator, &points, cum, 50.0);
    defer allocator.free(smoothed);
    try std.testing.expect(smoothed[2] < 110.0);
}

test "accumulate: flat noisy signal yields near-zero gain" {
    const allocator = std.testing.allocator;
    const elev = [_]f64{ 100.0, 101.5, 99.0, 100.5, 98.5, 101.0, 99.5, 100.0 };
    var gl = try accumulate(allocator, &elev, 3.0);
    defer gl.deinit(allocator);
    try std.testing.expectApproxEqAbs(0.0, gl.totalGain, 0.001);
    try std.testing.expectApproxEqAbs(0.0, gl.totalLoss, 0.001);
}

test "accumulate: clean monotonic climb counts full gain" {
    const allocator = std.testing.allocator;
    const elev = [_]f64{ 0.0, 10.0, 20.0, 30.0, 40.0, 50.0 };
    var gl = try accumulate(allocator, &elev, 3.0);
    defer gl.deinit(allocator);
    try std.testing.expectApproxEqAbs(50.0, gl.totalGain, 0.001);
    try std.testing.expectApproxEqAbs(0.0, gl.totalLoss, 0.001);
}

test "accumulate: sub-threshold steps on a steady climb count within one threshold" {
    const allocator = std.testing.allocator;
    const elev = [_]f64{ 0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0 };
    var gl = try accumulate(allocator, &elev, 3.0);
    defer gl.deinit(allocator);
    // Deadband under-counts by at most `threshold` at the tail (conservative).
    try std.testing.expect(gl.totalGain >= 6.0 - 3.0 and gl.totalGain <= 6.0);
}

test "accumulate: noisy climb stays close to true gain" {
    const allocator = std.testing.allocator;
    const elev = [_]f64{ 0.0, 9.0, 11.0, 19.0, 21.0, 29.0, 31.0, 40.0 };
    var gl = try accumulate(allocator, &elev, 3.0);
    defer gl.deinit(allocator);
    try std.testing.expect(gl.totalGain >= 36.0 and gl.totalGain <= 40.0);
    try std.testing.expectApproxEqAbs(0.0, gl.totalLoss, 0.001);
}

test "accumulate: cumulative arrays are monotonic" {
    const allocator = std.testing.allocator;
    const elev = [_]f64{ 0.0, 10.0, 5.0, 15.0, 0.0 };
    var gl = try accumulate(allocator, &elev, 3.0);
    defer gl.deinit(allocator);
    for (1..gl.cumGain.len) |i| {
        try std.testing.expect(gl.cumGain[i] >= gl.cumGain[i - 1]);
        try std.testing.expect(gl.cumLoss[i] >= gl.cumLoss[i - 1]);
    }
}

test "computeGainLoss: spike does not inflate gain or loss" {
    const allocator = std.testing.allocator;
    const points = [_][3]f64{
        .{ 0.0, 0.0000, 100.0 },
        .{ 0.0, 0.0001, 100.0 },
        .{ 0.0, 0.0002, 145.0 },
        .{ 0.0, 0.0003, 100.0 },
        .{ 0.0, 0.0004, 100.0 },
    };
    var gl = try computeGainLoss(allocator, &points, 50.0, 3.0);
    defer gl.deinit(allocator);
    try std.testing.expectApproxEqAbs(0.0, gl.totalGain, 0.001);
    try std.testing.expectApproxEqAbs(0.0, gl.totalLoss, 0.001);
}

test "computeGainLoss: empty input" {
    const allocator = std.testing.allocator;
    var gl = try computeGainLoss(allocator, &.{}, 15.0, 3.0);
    defer gl.deinit(allocator);
    try std.testing.expectEqual(@as(usize, 0), gl.cumGain.len);
    try std.testing.expectEqual(@as(f64, 0.0), gl.totalGain);
}
