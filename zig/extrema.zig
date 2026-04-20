const std = @import("std");

/// Minimal configuration for AMPD peak detection
pub const AMPDConfig = struct {
    scale_max: usize = 21,
    threshold: usize = 15,

    pub fn validate(self: AMPDConfig, signal_len: usize) !void {
        if (self.scale_max == 0) return error.InvalidScaleMax;
        if (self.threshold == 0) return error.InvalidThreshold;
        if (self.threshold > self.scale_max) return error.ThresholdExceedsScaleMax;
        if (signal_len < 3) return error.SignalTooShort;
    }
};

const CLUSTER_WINDOW: usize = 3;
const SIMD_CHUNK: usize = 8;

fn clusterExtrema(allocator: std.mem.Allocator, extrema_raw: []const usize, signal: []const f32, comptime find_peaks: bool) ![]usize {
    if (extrema_raw.len == 0) return &.{};

    var clustered = std.ArrayList(usize){};
    defer clustered.deinit(allocator);

    var best_idx = extrema_raw[0];
    var best_val = signal[extrema_raw[0]];

    for (1..extrema_raw.len) |i| {
        const current_idx = extrema_raw[i];
        const prev_idx = extrema_raw[i - 1];

        if (current_idx - prev_idx <= CLUSTER_WINDOW) {
            const current_val = signal[current_idx];
            const is_better = if (find_peaks) current_val > best_val else current_val < best_val;
            if (is_better) {
                best_val = current_val;
                best_idx = current_idx;
            }
        } else {
            try clustered.append(allocator, best_idx);
            best_idx = current_idx;
            best_val = signal[current_idx];
        }
    }

    try clustered.append(allocator, best_idx);
    return try clustered.toOwnedSlice(allocator);
}

fn ampd_core_extrema(
    allocator: std.mem.Allocator,
    signal: []const f32,
    scale_max: usize,
    threshold: usize,
    comptime find_peaks: bool,
) ![]usize {
    if (signal.len == 0 or scale_max == 0) return &.{};
    if (signal.len < 3) return &.{};

    const effective_scale_max = @min(scale_max, signal.len / 2);
    if (effective_scale_max == 0) return &.{};

    // Single u8 count array — replaces bool[scale_max * n] scalogram.
    // For a 10k-point trail with scale_max=21, memory drops from ~210KB to ~10KB
    // (fits in L1 cache), and we eliminate the second counting pass entirely.
    var counts = try allocator.alloc(u8, signal.len);
    defer allocator.free(counts);
    @memset(counts, 0);

    for (1..effective_scale_max + 1) |scale| {
        if (scale * 2 >= signal.len) break;

        var i: usize = scale;

        // SIMD path: process 8 points at a time
        while (i + SIMD_CHUNK + scale <= signal.len) : (i += SIMD_CHUNK) {
            const center: @Vector(SIMD_CHUNK, f32) = signal[i..][0..SIMD_CHUNK].*;
            const left: @Vector(SIMD_CHUNK, f32) = signal[i - scale ..][0..SIMD_CHUNK].*;
            const right: @Vector(SIMD_CHUNK, f32) = signal[i + scale ..][0..SIMD_CHUNK].*;

            const cmp_left = if (find_peaks) center > left else center < left;
            const cmp_right = if (find_peaks) center > right else center < right;
            const mask: @Vector(SIMD_CHUNK, bool) = @select(
                bool,
                cmp_left,
                cmp_right,
                @as(@Vector(SIMD_CHUNK, bool), @splat(false)),
            );

            inline for (0..SIMD_CHUNK) |j| {
                if (mask[j]) counts[i + j] +|= 1;
            }
        }

        // Scalar remainder
        while (i < signal.len - scale) : (i += 1) {
            const is_extremum = if (find_peaks)
                signal[i] > signal[i - scale] and signal[i] > signal[i + scale]
            else
                signal[i] < signal[i - scale] and signal[i] < signal[i + scale];
            if (is_extremum) counts[i] +|= 1;
        }
    }

    var extrema = std.ArrayList(usize){};
    defer extrema.deinit(allocator);

    const thresh_u8: u8 = @intCast(@min(threshold, std.math.maxInt(u8)));
    for (0..signal.len) |i| {
        if (counts[i] >= thresh_u8) {
            try extrema.append(allocator, i);
        }
    }

    return try extrema.toOwnedSlice(allocator);
}

pub fn ampd(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize) ![]usize {
    const raw = try ampd_core_extrema(allocator, signal, scale_max, threshold, true);
    defer allocator.free(raw);
    return clusterExtrema(allocator, raw, signal, true);
}

pub fn ampdValleys(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize) ![]usize {
    const raw = try ampd_core_extrema(allocator, signal, scale_max, threshold, false);
    defer allocator.free(raw);
    return clusterExtrema(allocator, raw, signal, false);
}

pub fn findPeaks(allocator: std.mem.Allocator, signal: []const f32) ![]usize {
    const config = AMPDConfig{};
    try config.validate(signal.len);
    return ampd(allocator, signal, config.scale_max, config.threshold);
}

pub fn findValleys(allocator: std.mem.Allocator, signal: []const f32) ![]usize {
    const config = AMPDConfig{};
    try config.validate(signal.len);
    return ampdValleys(allocator, signal, config.scale_max, config.threshold);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test "ampd: flat signal" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 2.0, 2.0, 2.0, 2.0, 2.0 };
    const peaks = try ampd(allocator, &signal, 2, 1);
    defer allocator.free(peaks);
    try std.testing.expectEqual(@as(usize, 0), peaks.len);
}

test "ampd: large scale compared to signal" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 5.0, 2.0 };
    const peaks = try ampd(allocator, &signal, 10, 1);
    defer allocator.free(peaks);
    try std.testing.expect(peaks.len <= signal.len);
}

test "ampd: noise resilience" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 1.1, 5.0, 4.9, 2.0, 2.1, 1.9, 6.0, 5.9, 1.0 };
    const peaks = try ampd(allocator, &signal, 3, 2);
    defer allocator.free(peaks);
    var found_major_peaks = false;
    for (peaks) |peak_idx| {
        if (peak_idx == 2 or peak_idx == 7) found_major_peaks = true;
    }
    try std.testing.expect(found_major_peaks);
}

test "ampd: performance with large signal" {
    const allocator = std.testing.allocator;
    var signal = try allocator.alloc(f32, 100);
    defer allocator.free(signal);
    for (0..signal.len) |i| {
        const x = @as(f32, @floatFromInt(i)) / 10.0;
        signal[i] = @sin(x) + 0.1 * @sin(x * 10);
    }
    const peaks = try ampd(allocator, signal, 5, 2);
    defer allocator.free(peaks);
    try std.testing.expect(peaks.len < signal.len);
}

test "ampd: single scale vs multiple scales" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 3.0, 5.0, 3.0, 1.0, 4.0, 6.0, 4.0, 1.0 };
    const peaks_single = try ampd(allocator, &signal, 1, 1);
    defer allocator.free(peaks_single);
    const peaks_multi = try ampd(allocator, &signal, 3, 1);
    defer allocator.free(peaks_multi);
    try std.testing.expect(peaks_multi.len <= peaks_single.len);
}

test "findValleys: basic valley detection" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 5.0, 3.0, 1.0, 3.0, 5.0, 2.0, 4.0, 2.0, 5.0 };
    const valleys = try ampdValleys(allocator, &signal, 3, 2);
    defer allocator.free(valleys);
    try std.testing.expect(valleys.len > 0);
    for (valleys) |v| {
        if (v > 0 and v < signal.len - 1) {
            try std.testing.expect(signal[v] < signal[v - 1] and signal[v] < signal[v + 1]);
        }
    }
}

test "findValleys: flat signal has no valleys" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 3.0, 3.0, 3.0, 3.0, 3.0 };
    const valleys = try findValleys(allocator, &signal);
    defer allocator.free(valleys);
    try std.testing.expectEqual(@as(usize, 0), valleys.len);
}

test "findValleys: symmetric to findPeaks on inverted signal" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 5.0, 1.0, 5.0, 1.0, 5.0, 1.0, 5.0, 1.0 };
    const peaks = try ampd(allocator, &signal, 2, 1);
    defer allocator.free(peaks);
    const valleys = try ampdValleys(allocator, &signal, 2, 1);
    defer allocator.free(valleys);
    try std.testing.expectEqual(peaks.len, valleys.len);
}

test "configuration validation" {
    var config = AMPDConfig{ .scale_max = 0 };
    try std.testing.expectError(error.InvalidScaleMax, config.validate(10));
    config = AMPDConfig{ .threshold = 0 };
    try std.testing.expectError(error.InvalidThreshold, config.validate(10));
    config = AMPDConfig{ .threshold = 5, .scale_max = 3 };
    try std.testing.expectError(error.ThresholdExceedsScaleMax, config.validate(10));
    config = AMPDConfig{};
    try std.testing.expectError(error.SignalTooShort, config.validate(2));
}
