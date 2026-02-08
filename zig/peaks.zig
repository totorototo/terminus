const std = @import("std");

/// Minimal configuration for AMPD peak detection
pub const AMPDConfig = struct {
    scale_max: usize = 21,
    threshold_peaks: usize = 15,

    pub fn validate(self: AMPDConfig, signal_len: usize) !void {
        if (self.scale_max == 0) return error.InvalidScaleMax;
        if (self.threshold_peaks == 0) return error.InvalidThreshold;
        if (self.threshold_peaks > self.scale_max) return error.ThresholdExceedsScaleMax;
        if (signal_len < 3) return error.SignalTooShort;
    }
};

// Cluster consecutive peaks and return highest point in each cluster
fn clusterPeaks(allocator: std.mem.Allocator, peaks_raw: []const usize, signal: []const f32) ![]usize {
    if (peaks_raw.len == 0) return &.{};

    var clustered = std.ArrayList(usize){};
    defer clustered.deinit(allocator);

    var cluster_start = peaks_raw[0];
    var max_idx = peaks_raw[0];
    var max_ele = signal[peaks_raw[0]];

    for (1..peaks_raw.len) |i| {
        const current_idx = peaks_raw[i];
        const prev_idx = peaks_raw[i - 1];

        // If consecutive (gap <= 1), continue cluster
        if (current_idx - prev_idx <= 3) {
            const current_ele = signal[current_idx];
            if (current_ele > max_ele) {
                max_ele = current_ele;
                max_idx = current_idx;
            }
        } else {
            // Gap found, save the cluster's peak
            try clustered.append(allocator, max_idx);
            // Start new cluster
            cluster_start = current_idx;
            max_idx = current_idx;
            max_ele = signal[current_idx];
        }
    }
    // Don't forget the last cluster
    try clustered.append(allocator, max_idx);

    return try clustered.toOwnedSlice(allocator);
}

// Minimal AMPD core for peaks only
fn ampd_core(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize) ![]usize {
    if (signal.len == 0 or scale_max == 0) return &.{};
    if (signal.len < 3) return &.{};

    const effective_scale_max = @min(scale_max, signal.len / 2);
    if (effective_scale_max == 0) return &.{};

    var scalogram_data = try allocator.alloc(bool, effective_scale_max * signal.len);
    defer allocator.free(scalogram_data);
    @memset(scalogram_data, false);

    for (1..effective_scale_max + 1) |scale| {
        if (scale * 2 >= signal.len) break;
        const row_offset = (scale - 1) * signal.len;
        for (scale..signal.len - scale) |i| {
            if (signal[i] > signal[i - scale] and signal[i] > signal[i + scale]) {
                scalogram_data[row_offset + i] = true;
            }
        }
    }

    // std.ArrayList is now unmanaged by default in Zig 0.15+
    var peaks = std.ArrayList(usize){};
    defer peaks.deinit(allocator);

    for (0..signal.len) |i| {
        var count: usize = 0;
        for (0..effective_scale_max) |scale| {
            if (scalogram_data[scale * signal.len + i]) count += 1;
        }
        if (count >= threshold) {
            try peaks.append(allocator, i);
        }
    }

    // Return ownership of the buffer as a slice
    return try peaks.toOwnedSlice(allocator);
}

pub fn ampd(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize) ![]usize {
    const raw_peaks = try ampd_core(allocator, signal, scale_max, threshold);
    defer allocator.free(raw_peaks);
    return clusterPeaks(allocator, raw_peaks, signal);
}

/// Convenience function using default configuration
pub fn findPeaks(allocator: std.mem.Allocator, signal: []const f32) ![]usize {
    const config = AMPDConfig{};
    try config.validate(signal.len);
    return ampd(allocator, signal, config.scale_max, config.threshold_peaks);
}

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
    const peaks = try ampd(allocator, &signal, 10, 1); // scale_max > signal.len
    defer allocator.free(peaks);
    // Should handle gracefully without crash
    try std.testing.expect(peaks.len <= signal.len);
}

test "ampd: noise resilience" {
    const allocator = std.testing.allocator;
    // Signal with noise but clear peaks
    const signal = [_]f32{ 1.0, 1.1, 5.0, 4.9, 2.0, 2.1, 1.9, 6.0, 5.9, 1.0 };
    const peaks = try ampd(allocator, &signal, 3, 2); // Higher threshold to filter noise
    defer allocator.free(peaks);

    // Should find main peaks despite noise
    var found_major_peaks = false;
    for (peaks) |peak_idx| {
        if (peak_idx == 2 or peak_idx == 7) { // Indices of major peaks (5.0 and 6.0)
            found_major_peaks = true;
        }
    }
    try std.testing.expect(found_major_peaks);
}

test "ampd: performance with large signal" {
    const allocator = std.testing.allocator;

    // Create a larger signal for performance testing
    var signal = try allocator.alloc(f32, 100);
    defer allocator.free(signal);

    // Generate synthetic signal with known peaks
    for (0..signal.len) |i| {
        const x = @as(f32, @floatFromInt(i)) / 10.0;
        signal[i] = @sin(x) + 0.1 * @sin(x * 10); // Main sine with noise
    }

    const peaks = try ampd(allocator, signal, 5, 2);
    defer allocator.free(peaks);

    // Should complete without error and find some peaks
    try std.testing.expect(peaks.len < signal.len); // Sanity check
}

test "ampd: single scale vs multiple scales" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 3.0, 5.0, 3.0, 1.0, 4.0, 6.0, 4.0, 1.0 };

    const peaks_single = try ampd(allocator, &signal, 1, 1);
    defer allocator.free(peaks_single);

    const peaks_multi = try ampd(allocator, &signal, 3, 1);
    defer allocator.free(peaks_multi);

    // Multi-scale should be more selective (or equal)
    try std.testing.expect(peaks_multi.len <= peaks_single.len);
}

test "configuration validation" {
    var config = AMPDConfig{ .scale_max = 0 };
    try std.testing.expectError(error.InvalidScaleMax, config.validate(10));

    config = AMPDConfig{ .threshold_peaks = 0 };
    try std.testing.expectError(error.InvalidThreshold, config.validate(10));

    config = AMPDConfig{ .threshold_peaks = 5, .scale_max = 3 };
    try std.testing.expectError(error.ThresholdExceedsScaleMax, config.validate(10));

    config = AMPDConfig{};
    try std.testing.expectError(error.SignalTooShort, config.validate(2));
}
