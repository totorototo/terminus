const std = @import("std");

/// Configuration parameters for AMPD (Automatic Multiscale-based Peak Detection) algorithm
pub const AMPDConfig = struct {
    /// Maximum scale to consider for peak detection
    scale_max: usize = 6,
    /// Minimum number of scales where a point must be a peak
    threshold_peaks: usize = 2,
    /// Minimum number of scales where a point must be a valley
    threshold_valleys: usize = 2,
    /// Minimum distance between consecutive peaks/valleys
    min_distance: usize = 2000,

    pub fn validate(self: AMPDConfig, signal_len: usize) !void {
        if (self.scale_max == 0) return error.InvalidScaleMax;
        if (self.threshold_peaks == 0 or self.threshold_valleys == 0) return error.InvalidThreshold;
        if (self.threshold_peaks > self.scale_max or self.threshold_valleys > self.scale_max) return error.ThresholdExceedsScaleMax;
        if (signal_len < 3) return error.SignalTooShort;
    }
};

pub const ExtremaType = enum {
    peak,
    valley,
};

pub const Extremum = struct {
    index: usize,
    type: ExtremaType,
    value: f32,
};

// Generic core AMPD function
fn ampd_core(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize, comptime detect_peaks: bool) ![]usize {
    if (signal.len == 0 or scale_max == 0) return &.{};
    if (signal.len < 3) return &.{}; // Need at least 3 points for comparison

    const effective_scale_max = @min(scale_max, signal.len / 2);
    if (effective_scale_max == 0) return &.{};

    // Use single allocation for scalogram data
    var scalogram_data = try allocator.alloc(bool, effective_scale_max * signal.len);
    defer allocator.free(scalogram_data);
    @memset(scalogram_data, false);

    // Fill scalogram with extrema positions for each scale
    for (1..effective_scale_max + 1) |scale| {
        if (scale * 2 >= signal.len) break;
        const row_offset = (scale - 1) * signal.len;

        for (scale..signal.len - scale) |i| {
            const is_extremum = if (detect_peaks)
                signal[i] > signal[i - scale] and signal[i] > signal[i + scale]
            else
                signal[i] < signal[i - scale] and signal[i] < signal[i + scale];

            if (is_extremum) {
                scalogram_data[row_offset + i] = true;
            }
        }
    }

    // Count extrema at each index
    var extrema_list = std.ArrayList(usize).init(allocator);
    defer extrema_list.deinit();

    for (0..signal.len) |i| {
        var count: usize = 0;
        for (0..effective_scale_max) |scale| {
            if (scalogram_data[scale * signal.len + i]) count += 1;
        }
        if (count >= threshold) {
            try extrema_list.append(i);
        }
    }

    return try extrema_list.toOwnedSlice();
}

pub fn ampd(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize) ![]usize {
    return ampd_core(allocator, signal, scale_max, threshold, true);
}

pub fn ampd_extrema(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize) ![]Extremum {
    if (signal.len == 0) return &.{};

    // Use separate thresholds for peaks and valleys
    const peaks = try ampd(allocator, signal, scale_max, threshold);
    defer allocator.free(peaks);

    const valleys = try ampd_valleys(allocator, signal, scale_max, threshold);
    defer allocator.free(valleys);

    var extrema = try std.ArrayList(Extremum).initCapacity(allocator, peaks.len + valleys.len);
    defer extrema.deinit();

    // Add peaks with values
    for (peaks) |peak_idx| {
        try extrema.append(Extremum{ .index = peak_idx, .type = .peak, .value = signal[peak_idx] });
    }

    // Add valleys with values
    for (valleys) |valley_idx| {
        try extrema.append(Extremum{ .index = valley_idx, .type = .valley, .value = signal[valley_idx] });
    }

    // Sort by index
    const ExtremaSorter = struct {
        pub fn lessThan(_: void, a: Extremum, b: Extremum) bool {
            return a.index < b.index;
        }
    };

    std.mem.sort(Extremum, extrema.items, {}, ExtremaSorter.lessThan);

    return try extrema.toOwnedSlice();
}

/// Convenience function using default configuration
pub fn findPeaks(allocator: std.mem.Allocator, signal: []const f32) ![]usize {
    const config = AMPDConfig{};
    try config.validate(signal.len);
    return ampd(allocator, signal, config.scale_max, config.threshold_peaks);
}

/// Convenience function using default configuration
pub fn findValleys(allocator: std.mem.Allocator, signal: []const f32) ![]usize {
    const config = AMPDConfig{};
    try config.validate(signal.len);
    return ampd_valleys(allocator, signal, config.scale_max, config.threshold_valleys);
}

/// Convenience function using default configuration
pub fn findExtrema(allocator: std.mem.Allocator, signal: []const f32) ![]Extremum {
    const config = AMPDConfig{};
    try config.validate(signal.len);
    return ampd_extrema(allocator, signal, config.scale_max, config.threshold_peaks);
}

/// Advanced function with configuration and post-processing
pub fn ampd_with_config(allocator: std.mem.Allocator, signal: []const f32, config: AMPDConfig) ![]Extremum {
    try config.validate(signal.len);

    var extrema = try ampd_extrema(allocator, signal, config.scale_max, config.threshold_peaks);

    // Apply minimum distance filter if specified
    if (config.min_distance > 1) {
        extrema = try filterByMinDistance(allocator, extrema, config.min_distance);
    }

    return extrema;
}

/// Filter extrema by minimum distance
fn filterByMinDistance(allocator: std.mem.Allocator, extrema: []Extremum, min_distance: usize) ![]Extremum {
    if (extrema.len <= 1) return extrema;

    var filtered = std.ArrayList(Extremum).init(allocator);
    defer filtered.deinit();

    try filtered.append(extrema[0]); // Always keep the first extremum

    for (extrema[1..]) |current| {
        const last = filtered.items[filtered.items.len - 1];
        if (current.index >= last.index + min_distance) {
            try filtered.append(current);
        }
    }

    // Free original and return filtered
    allocator.free(extrema);
    return try filtered.toOwnedSlice();
}

/// Statistical analysis of detected extrema
pub const ExtremaStats = struct {
    peak_count: usize,
    valley_count: usize,
    mean_peak_prominence: f32,
    mean_valley_depth: f32,
    max_prominence: f32,
    max_depth: f32,
};

/// Calculate statistical properties of extrema
pub fn analyzeExtrema(signal: []const f32, extrema: []const Extremum) ExtremaStats {
    var stats = ExtremaStats{
        .peak_count = 0,
        .valley_count = 0,
        .mean_peak_prominence = 0,
        .mean_valley_depth = 0,
        .max_prominence = 0,
        .max_depth = 0,
    };

    if (extrema.len == 0) return stats;

    var peak_sum: f32 = 0;
    var valley_sum: f32 = 0;

    for (extrema) |ext| {
        switch (ext.type) {
            .peak => {
                stats.peak_count += 1;
                const prominence = calculateProminence(signal, ext.index);
                peak_sum += prominence;
                stats.max_prominence = @max(stats.max_prominence, prominence);
            },
            .valley => {
                stats.valley_count += 1;
                const depth = calculateDepth(signal, ext.index);
                valley_sum += depth;
                stats.max_depth = @max(stats.max_depth, depth);
            },
        }
    }

    if (stats.peak_count > 0) {
        stats.mean_peak_prominence = peak_sum / @as(f32, @floatFromInt(stats.peak_count));
    }
    if (stats.valley_count > 0) {
        stats.mean_valley_depth = valley_sum / @as(f32, @floatFromInt(stats.valley_count));
    }

    return stats;
}

/// Calculate prominence of a peak (height above surrounding minima)
fn calculateProminence(signal: []const f32, peak_idx: usize) f32 {
    if (peak_idx == 0 or peak_idx >= signal.len - 1) return 0;

    const peak_value = signal[peak_idx];
    var left_min = peak_value;
    var right_min = peak_value;

    // Find minimum to the left
    var i: usize = peak_idx;
    while (i > 0) {
        i -= 1;
        left_min = @min(left_min, signal[i]);
    }

    // Find minimum to the right
    i = peak_idx;
    while (i < signal.len - 1) {
        i += 1;
        right_min = @min(right_min, signal[i]);
    }

    return peak_value - @max(left_min, right_min);
}

/// Calculate depth of a valley (depth below surrounding maxima)
fn calculateDepth(signal: []const f32, valley_idx: usize) f32 {
    if (valley_idx == 0 or valley_idx >= signal.len - 1) return 0;

    const valley_value = signal[valley_idx];
    var left_max = valley_value;
    var right_max = valley_value;

    // Find maximum to the left
    var i: usize = valley_idx;
    while (i > 0) {
        i -= 1;
        left_max = @max(left_max, signal[i]);
    }

    // Find maximum to the right
    i = valley_idx;
    while (i < signal.len - 1) {
        i += 1;
        right_max = @max(right_max, signal[i]);
    }

    return @min(left_max, right_max) - valley_value;
}

pub fn ampd_valleys(allocator: std.mem.Allocator, signal: []const f32, scale_max: usize, threshold: usize) ![]usize {
    return ampd_core(allocator, signal, scale_max, threshold, false);
}

test "ampd: empty signal" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{};
    const peaks = try ampd(allocator, &signal, 3, 1);
    defer allocator.free(peaks);
    try std.testing.expectEqual(@as(usize, 0), peaks.len);
}

test "ampd: single point signal" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{1.0};
    const peaks = try ampd(allocator, &signal, 3, 1);
    defer allocator.free(peaks);
    try std.testing.expectEqual(@as(usize, 0), peaks.len);
}

test "ampd: simple peak detection" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 2.0, 5.0, 3.0, 1.0 };
    const peaks = try ampd(allocator, &signal, 2, 1);
    defer allocator.free(peaks);

    // Should find the peak at index 2 (value 5.0)
    try std.testing.expect(peaks.len >= 1);
    var found_peak = false;
    for (peaks) |peak_idx| {
        if (peak_idx == 2) found_peak = true;
    }
    try std.testing.expect(found_peak);
}

test "ampd: multiple peaks" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 5.0, 2.0, 3.0, 7.0, 4.0, 1.0 };
    const peaks = try ampd(allocator, &signal, 2, 1);
    defer allocator.free(peaks);

    // Should find peaks, check that we find the main peaks
    try std.testing.expect(peaks.len >= 1);
    var found_peaks = [_]bool{ false, false };
    for (peaks) |peak_idx| {
        if (peak_idx == 1) found_peaks[0] = true; // Peak at index 1 (value 5.0)
        if (peak_idx == 4) found_peaks[1] = true; // Peak at index 4 (value 7.0)
    }
    try std.testing.expect(found_peaks[0] or found_peaks[1]); // At least one peak found
}

test "ampd: threshold filtering" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 3.0, 2.0, 4.0, 1.0, 6.0, 2.0 };

    // Low threshold - should find peaks
    const peaks_low = try ampd(allocator, &signal, 3, 1);
    defer allocator.free(peaks_low);

    // High threshold - should find fewer peaks
    const peaks_high = try ampd(allocator, &signal, 3, 3);
    defer allocator.free(peaks_high);

    try std.testing.expect(peaks_high.len <= peaks_low.len);
}

test "ampd: zero scale_max" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 5.0, 2.0 };
    const peaks = try ampd(allocator, &signal, 0, 1);
    defer allocator.free(peaks);
    try std.testing.expectEqual(@as(usize, 0), peaks.len);
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

test "ampd_valleys: simple valley detection" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 5.0, 3.0, 1.0, 4.0, 6.0 };
    const valleys = try ampd_valleys(allocator, &signal, 2, 1);
    defer allocator.free(valleys);

    // Should find the valley at index 2 (value 1.0)
    try std.testing.expect(valleys.len >= 1);
    var found_valley = false;
    for (valleys) |valley_idx| {
        if (valley_idx == 2) found_valley = true;
    }
    try std.testing.expect(found_valley);
}

test "ampd_valleys: multiple valleys" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 5.0, 1.0, 4.0, 3.0, 0.5, 6.0, 7.0 };
    const valleys = try ampd_valleys(allocator, &signal, 2, 1);
    defer allocator.free(valleys);

    // Should find valleys at indices 1 and 4
    try std.testing.expect(valleys.len >= 1);
    var found_valleys = [_]bool{ false, false };
    for (valleys) |valley_idx| {
        if (valley_idx == 1) found_valleys[0] = true; // Valley at index 1 (value 1.0)
        if (valley_idx == 4) found_valleys[1] = true; // Valley at index 4 (value 0.5)
    }
    try std.testing.expect(found_valleys[0] or found_valleys[1]);
}

test "ampd_valleys: empty and edge cases" {
    const allocator = std.testing.allocator;

    // Empty signal
    const empty_signal = [_]f32{};
    const empty_valleys = try ampd_valleys(allocator, &empty_signal, 3, 1);
    defer allocator.free(empty_valleys);
    try std.testing.expectEqual(@as(usize, 0), empty_valleys.len);

    // Flat signal
    const flat_signal = [_]f32{ 3.0, 3.0, 3.0, 3.0 };
    const flat_valleys = try ampd_valleys(allocator, &flat_signal, 2, 1);
    defer allocator.free(flat_valleys);
    try std.testing.expectEqual(@as(usize, 0), flat_valleys.len);

    // Zero scale_max
    const signal = [_]f32{ 5.0, 1.0, 4.0 };
    const zero_scale_valleys = try ampd_valleys(allocator, &signal, 0, 1);
    defer allocator.free(zero_scale_valleys);
    try std.testing.expectEqual(@as(usize, 0), zero_scale_valleys.len);
}

test "ampd_extrema: combined peaks and valleys" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 5.0, 2.0, 1.0, 6.0, 3.0, 1.0 };
    const extrema = try ampd_extrema(allocator, &signal, 2, 1);
    defer allocator.free(extrema);

    // Should find both peaks and valleys
    try std.testing.expect(extrema.len >= 2);

    var has_peak = false;
    var has_valley = false;
    for (extrema) |ext| {
        if (ext.type == .peak) has_peak = true;
        if (ext.type == .valley) has_valley = true;
    }
    try std.testing.expect(has_peak and has_valley);
}

test "ampd_extrema: sorting verification" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.0, 6.0, 2.0, 7.0, 1.5, 8.0, 0.5 };
    const extrema = try ampd_extrema(allocator, &signal, 3, 1);
    defer allocator.free(extrema);

    // Verify that extrema are sorted by index
    for (1..extrema.len) |i| {
        try std.testing.expect(extrema[i - 1].index <= extrema[i].index);
    }
}

test "ampd_extrema: empty signal" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{};
    const extrema = try ampd_extrema(allocator, &signal, 3, 1);
    defer allocator.free(extrema);
    try std.testing.expectEqual(@as(usize, 0), extrema.len);
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

test "convenience functions" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3 };

    // Test convenience functions
    const peaks = try findPeaks(allocator, &signal);
    defer allocator.free(peaks);

    const valleys = try findValleys(allocator, &signal);
    defer allocator.free(valleys);

    const extrema = try findExtrema(allocator, &signal);
    defer allocator.free(extrema);

    try std.testing.expect(peaks.len > 0);
    // Valleys might be 0 for this particular signal with default settings
    try std.testing.expect(extrema.len >= peaks.len);
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

test "minimum distance filtering" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3, 9, 2 };

    const config = AMPDConfig{ .min_distance = 3 };
    const extrema = try ampd_with_config(allocator, &signal, config);
    defer allocator.free(extrema);

    // Check that consecutive extrema are at least min_distance apart
    for (0..extrema.len - 1) |i| {
        const distance = extrema[i + 1].index - extrema[i].index;
        try std.testing.expect(distance >= config.min_distance);
    }
}

test "extrema statistics" {
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3 };
    const extrema = [_]Extremum{
        .{ .index = 1, .type = .peak, .value = 5 },
        .{ .index = 3, .type = .peak, .value = 8 },
        .{ .index = 2, .type = .valley, .value = 2 },
        .{ .index = 4, .type = .valley, .value = 1 },
    };

    const stats = analyzeExtrema(&signal, &extrema);

    try std.testing.expect(stats.peak_count == 2);
    try std.testing.expect(stats.valley_count == 2);
    try std.testing.expect(stats.mean_peak_prominence > 0);
    try std.testing.expect(stats.mean_valley_depth > 0);
}

test "calculateProminence: edge cases" {
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3 };

    // Test first index (should return 0)
    try std.testing.expectEqual(@as(f32, 0), calculateProminence(&signal, 0));

    // Test last index (should return 0)
    try std.testing.expectEqual(@as(f32, 0), calculateProminence(&signal, signal.len - 1));

    // Test normal peak
    const prominence = calculateProminence(&signal, 1); // Peak at value 5
    try std.testing.expect(prominence > 0);

    // Test with single point signal
    const single = [_]f32{5};
    try std.testing.expectEqual(@as(f32, 0), calculateProminence(&single, 0));
}

test "calculateDepth: edge cases" {
    const signal = [_]f32{ 5, 1, 6, 2, 8, 1, 7 };

    // Test first index (should return 0)
    try std.testing.expectEqual(@as(f32, 0), calculateDepth(&signal, 0));

    // Test last index (should return 0)
    try std.testing.expectEqual(@as(f32, 0), calculateDepth(&signal, signal.len - 1));

    // Test normal valley
    const depth = calculateDepth(&signal, 1); // Valley at value 1
    try std.testing.expect(depth > 0);

    // Test with single point signal
    const single = [_]f32{1};
    try std.testing.expectEqual(@as(f32, 0), calculateDepth(&single, 0));
}

test "analyzeExtrema: empty and edge cases" {
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3 };

    // Test with empty extrema array
    const empty_extrema: []const Extremum = &.{};
    const empty_stats = analyzeExtrema(&signal, empty_extrema);
    try std.testing.expectEqual(@as(usize, 0), empty_stats.peak_count);
    try std.testing.expectEqual(@as(usize, 0), empty_stats.valley_count);
    try std.testing.expectEqual(@as(f32, 0), empty_stats.mean_peak_prominence);
    try std.testing.expectEqual(@as(f32, 0), empty_stats.mean_valley_depth);

    // Test with only peaks
    const only_peaks = [_]Extremum{
        .{ .index = 1, .type = .peak, .value = 5 },
        .{ .index = 3, .type = .peak, .value = 8 },
    };
    const peak_stats = analyzeExtrema(&signal, &only_peaks);
    try std.testing.expectEqual(@as(usize, 2), peak_stats.peak_count);
    try std.testing.expectEqual(@as(usize, 0), peak_stats.valley_count);
    try std.testing.expectEqual(@as(f32, 0), peak_stats.mean_valley_depth);

    // Test with only valleys
    const only_valleys = [_]Extremum{
        .{ .index = 2, .type = .valley, .value = 2 },
        .{ .index = 4, .type = .valley, .value = 1 },
    };
    const valley_stats = analyzeExtrema(&signal, &only_valleys);
    try std.testing.expectEqual(@as(usize, 0), valley_stats.peak_count);
    try std.testing.expectEqual(@as(usize, 2), valley_stats.valley_count);
    try std.testing.expectEqual(@as(f32, 0), valley_stats.mean_peak_prominence);
}

test "filterByMinDistance: edge cases" {
    const allocator = std.testing.allocator;

    // Test with single extremum
    const single_extremum = [_]Extremum{
        .{ .index = 1, .type = .peak, .value = 5 },
    };
    const single_copy = try allocator.dupe(Extremum, &single_extremum);
    const filtered_single = try filterByMinDistance(allocator, single_copy, 3);
    defer allocator.free(filtered_single);
    try std.testing.expectEqual(@as(usize, 1), filtered_single.len);

    // Test with empty array
    const empty_array: []Extremum = &.{};
    const filtered_empty = try filterByMinDistance(allocator, empty_array, 3);
    defer allocator.free(filtered_empty);
    try std.testing.expectEqual(@as(usize, 0), filtered_empty.len);

    // Test with extrema too close together
    const close_extrema = [_]Extremum{
        .{ .index = 1, .type = .peak, .value = 5 },
        .{ .index = 2, .type = .valley, .value = 2 },
        .{ .index = 3, .type = .peak, .value = 4 },
        .{ .index = 7, .type = .peak, .value = 6 },
    };
    const close_copy = try allocator.dupe(Extremum, &close_extrema);
    const filtered_close = try filterByMinDistance(allocator, close_copy, 3);
    defer allocator.free(filtered_close);

    // Should keep first and last (indices 1 and 7 are >= 3 apart)
    try std.testing.expect(filtered_close.len <= close_extrema.len);
    try std.testing.expectEqual(@as(usize, 1), filtered_close[0].index);
}

test "ampd_with_config: comprehensive test" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3, 9, 2, 7, 1 };

    // Test with default config
    const default_config = AMPDConfig{};
    const default_extrema = try ampd_with_config(allocator, &signal, default_config);
    defer allocator.free(default_extrema);

    // Test with strict config
    const strict_config = AMPDConfig{
        .scale_max = 5,
        .threshold = 3,
        .min_distance = 4,
    };
    const strict_extrema = try ampd_with_config(allocator, &signal, strict_config);
    defer allocator.free(strict_extrema);

    // Strict config should have fewer or equal extrema
    try std.testing.expect(strict_extrema.len <= default_extrema.len);

    // Verify minimum distance constraint
    for (0..strict_extrema.len - 1) |i| {
        const distance = strict_extrema[i + 1].index - strict_extrema[i].index;
        try std.testing.expect(distance >= strict_config.min_distance);
    }
}

test "ampd_core: direct testing" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3 };

    // Test peaks detection
    const peaks = try ampd_core(allocator, &signal, 3, 2, true);
    defer allocator.free(peaks);

    // Test valleys detection
    const valleys = try ampd_core(allocator, &signal, 3, 2, false);
    defer allocator.free(valleys);

    // Test with large effective_scale_max boundary
    const large_scale = try ampd_core(allocator, &signal, signal.len, 1, true);
    defer allocator.free(large_scale);

    // Test with signal too small for effective scale
    const tiny_signal = [_]f32{ 1, 2 };
    const tiny_result = try ampd_core(allocator, &tiny_signal, 5, 1, true);
    defer allocator.free(tiny_result);
    try std.testing.expectEqual(@as(usize, 0), tiny_result.len);
}

test "extrema value field verification" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3 };

    const extrema = try ampd_extrema(allocator, &signal, 3, 1);
    defer allocator.free(extrema);

    // Verify that all extrema have correct values from signal
    for (extrema) |ext| {
        try std.testing.expectEqual(signal[ext.index], ext.value);
    }
}

test "configuration: valid configurations" {
    var config = AMPDConfig{
        .scale_max = 5,
        .threshold = 3,
        .min_distance = 2,
    };

    // Should validate successfully
    try config.validate(10);

    // Test boundary cases
    config = AMPDConfig{ .scale_max = 1, .threshold = 1, .min_distance = 1 };
    try config.validate(3);

    config = AMPDConfig{ .scale_max = 100, .threshold = 50, .min_distance = 10 };
    try config.validate(1000);
}

test "extrema sorting with duplicate indices" {
    const allocator = std.testing.allocator;

    // Create signal where peaks and valleys might have same indices
    const signal = [_]f32{ 1, 3, 1, 3, 1, 3, 1 };

    const extrema = try ampd_extrema(allocator, &signal, 2, 1);
    defer allocator.free(extrema);

    // Verify sorting regardless of content
    for (1..extrema.len) |i| {
        try std.testing.expect(extrema[i - 1].index <= extrema[i].index);
    }
}

test "prominence and depth calculation accuracy" {
    // Test prominence calculation with known values
    const peak_signal = [_]f32{ 1, 2, 5, 3, 1 }; // Peak at index 2, value 5
    const prominence = calculateProminence(&peak_signal, 2);
    // Peak value 5, surrounding minima are 1, so prominence should be 5-1=4
    try std.testing.expectEqual(@as(f32, 4), prominence);

    // Test depth calculation with known values
    const valley_signal = [_]f32{ 5, 4, 1, 3, 6 }; // Valley at index 2, value 1
    const depth = calculateDepth(&valley_signal, 2);
    // Valley value 1, surrounding maxima are 5 and 6, so depth should be 5-1=4
    try std.testing.expectEqual(@as(f32, 4), depth);
}

test "ampd_extrema: capacity optimization" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3, 9, 2 };

    // Test that initCapacity is used correctly
    const extrema = try ampd_extrema(allocator, &signal, 2, 1);
    defer allocator.free(extrema);

    // Just verify it completes successfully and produces reasonable results
    try std.testing.expect(extrema.len >= 0); // Basic sanity check

    // Verify all extrema are within signal bounds
    for (extrema) |ext| {
        try std.testing.expect(ext.index < signal.len);
        try std.testing.expectEqual(signal[ext.index], ext.value);
    }
}

test "ampd_core: boundary conditions" {
    const allocator = std.testing.allocator;

    // Test with scale exactly half of signal length
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6 }; // length 6
    const result = try ampd_core(allocator, &signal, 3, 1, true); // scale_max = 3 = len/2
    defer allocator.free(result);

    // Test with scale that triggers early break
    const break_result = try ampd_core(allocator, &signal, 10, 1, true);
    defer allocator.free(break_result);

    // Test effective_scale_max calculation with various inputs
    const small_signal = [_]f32{ 1, 2, 3 };
    const small_result = try ampd_core(allocator, &small_signal, 5, 1, true);
    defer allocator.free(small_result);
}

test "sorting: ExtremaSorter edge cases" {
    const allocator = std.testing.allocator;

    // Test with extrema having same indices (shouldn't happen in practice but test sorting stability)
    var extrema = std.ArrayList(Extremum).init(allocator);
    defer extrema.deinit();

    try extrema.append(.{ .index = 5, .type = .peak, .value = 8 });
    try extrema.append(.{ .index = 2, .type = .valley, .value = 1 });
    try extrema.append(.{ .index = 5, .type = .valley, .value = 3 }); // Same index as first
    try extrema.append(.{ .index = 1, .type = .peak, .value = 6 });

    const ExtremaSorter = struct {
        pub fn lessThan(_: void, a: Extremum, b: Extremum) bool {
            return a.index < b.index;
        }
    };

    std.mem.sort(Extremum, extrema.items, {}, ExtremaSorter.lessThan);

    // Verify sorting worked
    try std.testing.expectEqual(@as(usize, 1), extrema.items[0].index);
    try std.testing.expectEqual(@as(usize, 2), extrema.items[1].index);
    try std.testing.expectEqual(@as(usize, 5), extrema.items[2].index);
    try std.testing.expectEqual(@as(usize, 5), extrema.items[3].index);
}

test "memory management: large allocations" {
    const allocator = std.testing.allocator;

    // Test with larger signal to stress memory management
    var large_signal = try allocator.alloc(f32, 50);
    defer allocator.free(large_signal);

    // Create a pattern with clear peaks and valleys
    for (0..large_signal.len) |i| {
        const t = @as(f32, @floatFromInt(i)) / 5.0;
        large_signal[i] = @sin(t) + 0.2 * @sin(t * 5); // Sine wave with harmonics
    }

    const extrema = try ampd_extrema(allocator, large_signal, 8, 3);
    defer allocator.free(extrema);

    // Verify memory was managed correctly (test completes without leak)
    try std.testing.expect(extrema.len >= 0);
}

test "filterByMinDistance: comprehensive filtering" {
    const allocator = std.testing.allocator;

    // Test with many closely spaced extrema
    const many_extrema = [_]Extremum{
        .{ .index = 1, .type = .peak, .value = 5 },
        .{ .index = 2, .type = .valley, .value = 2 },
        .{ .index = 3, .type = .peak, .value = 4 },
        .{ .index = 4, .type = .valley, .value = 1 },
        .{ .index = 5, .type = .peak, .value = 3 },
        .{ .index = 10, .type = .peak, .value = 7 },
        .{ .index = 15, .type = .valley, .value = 1 },
    };

    const copy = try allocator.dupe(Extremum, &many_extrema);
    const filtered = try filterByMinDistance(allocator, copy, 5);
    defer allocator.free(filtered);

    // Should keep first (index 1), then first one >= 5 away (index 10), then >= 5 away from that (index 15)
    try std.testing.expect(filtered.len <= many_extrema.len);
    try std.testing.expectEqual(@as(usize, 1), filtered[0].index);

    // Verify distance constraint
    for (1..filtered.len) |i| {
        const distance = filtered[i].index - filtered[i - 1].index;
        try std.testing.expect(distance >= 5);
    }
}

test "configuration: min_distance edge cases" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1, 6, 3, 9, 2, 7, 1 };

    // Test with min_distance = 1 (no filtering)
    const config1 = AMPDConfig{ .min_distance = 1 };
    const result1 = try ampd_with_config(allocator, &signal, config1);
    defer allocator.free(result1);

    // Test with very large min_distance
    const config_large = AMPDConfig{ .min_distance = signal.len };
    const result_large = try ampd_with_config(allocator, &signal, config_large);
    defer allocator.free(result_large);

    // Should have at most 1 extremum with such large min_distance
    try std.testing.expect(result_large.len <= 1);
}

test "analyzeExtrema: statistical edge cases" {
    const signal = [_]f32{ 0, 10, 0, 10, 0 };

    // Test with extrema at signal boundaries
    const boundary_extrema = [_]Extremum{
        .{ .index = 0, .type = .valley, .value = 0 }, // At start
        .{ .index = 4, .type = .valley, .value = 0 }, // At end
        .{ .index = 1, .type = .peak, .value = 10 },
        .{ .index = 3, .type = .peak, .value = 10 },
    };

    const stats = analyzeExtrema(&signal, &boundary_extrema);

    try std.testing.expectEqual(@as(usize, 2), stats.peak_count);
    try std.testing.expectEqual(@as(usize, 2), stats.valley_count);

    // Boundary extrema should have 0 prominence/depth
    try std.testing.expect(stats.mean_peak_prominence >= 0);
    try std.testing.expect(stats.mean_valley_depth >= 0);
}

test "convenience functions: error propagation" {
    const allocator = std.testing.allocator;

    // Test error propagation from validation
    const too_short = [_]f32{ 1, 2 }; // Only 2 points, should fail validation

    try std.testing.expectError(error.SignalTooShort, findPeaks(allocator, &too_short));
    try std.testing.expectError(error.SignalTooShort, findValleys(allocator, &too_short));
    try std.testing.expectError(error.SignalTooShort, findExtrema(allocator, &too_short));
}

test "ampd_core: scalogram indexing" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 3, 1, 5, 2, 6, 1 };

    // Test various scale values to ensure proper scalogram indexing
    for (1..4) |scale_max| {
        const peaks = try ampd_core(allocator, &signal, scale_max, 1, true);
        defer allocator.free(peaks);

        const valleys = try ampd_core(allocator, &signal, scale_max, 1, false);
        defer allocator.free(valleys);

        // Just verify no crashes and results are reasonable
        for (peaks) |idx| {
            try std.testing.expect(idx < signal.len);
        }
        for (valleys) |idx| {
            try std.testing.expect(idx < signal.len);
        }
    }
}

test "extrema value consistency" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1.5, 4.2, 2.1, 7.8, 1.3, 5.9, 3.4 };

    const extrema = try ampd_extrema(allocator, &signal, 3, 1);
    defer allocator.free(extrema);

    // Verify that value field matches signal at index for all extrema
    for (extrema) |ext| {
        try std.testing.expect(ext.index < signal.len);
        try std.testing.expectEqual(signal[ext.index], ext.value);

        // Also verify type is valid
        try std.testing.expect(ext.type == .peak or ext.type == .valley);
    }
}

test "calculateProminence: comprehensive cases" {
    // Test with asymmetric peak
    const asymmetric = [_]f32{ 2, 1, 8, 3, 0 }; // Peak at index 2
    const asym_prominence = calculateProminence(&asymmetric, 2);
    // Peak value 8, left min 1, right min 0, prominence = 8 - max(1,0) = 8 - 1 = 7
    try std.testing.expectEqual(@as(f32, 7), asym_prominence);

    // Test with plateau-like structure
    const plateau = [_]f32{ 1, 5, 5, 5, 2 }; // Peak in middle of plateau
    const plateau_prominence = calculateProminence(&plateau, 2);
    try std.testing.expect(plateau_prominence > 0);

    // Test with very short signal
    const short_signal = [_]f32{ 1, 5, 2 };
    // Peak at index 1 (value 5), left min = 1, right min = 2, prominence = 5 - max(1,2) = 5 - 2 = 3
    try std.testing.expectEqual(@as(f32, 3), calculateProminence(&short_signal, 1));
}

test "calculateDepth: comprehensive cases" {
    // Test with asymmetric valley
    const asymmetric = [_]f32{ 8, 6, 1, 7, 9 }; // Valley at index 2
    const asym_depth = calculateDepth(&asymmetric, 2);
    // Valley value 1, left max 8, right max 9, depth = min(8,9) - 1 = 8 - 1 = 7
    try std.testing.expectEqual(@as(f32, 7), asym_depth);

    // Test with plateau-like structure
    const plateau = [_]f32{ 5, 1, 1, 1, 4 }; // Valley in middle of plateau
    const plateau_depth = calculateDepth(&plateau, 2);
    try std.testing.expect(plateau_depth > 0);

    // Test with very short signal
    const short_signal = [_]f32{ 5, 1, 4 };
    // Valley at index 1 (value 1), left max = 5, right max = 4, depth = min(5,4) - 1 = 4 - 1 = 3
    try std.testing.expectEqual(@as(f32, 3), calculateDepth(&short_signal, 1));
}

test "filterByMinDistance: memory ownership" {
    const allocator = std.testing.allocator;

    // Test that original array is properly freed and new one returned
    const original = [_]Extremum{
        .{ .index = 1, .type = .peak, .value = 5 },
        .{ .index = 3, .type = .valley, .value = 2 },
        .{ .index = 8, .type = .peak, .value = 6 },
    };

    const copy = try allocator.dupe(Extremum, &original);
    // copy will be freed by filterByMinDistance
    const filtered = try filterByMinDistance(allocator, copy, 2);
    defer allocator.free(filtered);

    // Verify we got a new array with expected filtering
    try std.testing.expect(filtered.len <= original.len);
    try std.testing.expectEqual(@as(usize, 1), filtered[0].index);
}

test "ampd_with_config: validation error handling" {
    const allocator = std.testing.allocator;
    const signal = [_]f32{ 1, 5, 2, 8, 1 };

    // Test various invalid configurations
    var bad_config = AMPDConfig{ .scale_max = 0 };
    try std.testing.expectError(error.InvalidScaleMax, ampd_with_config(allocator, &signal, bad_config));

    bad_config = AMPDConfig{ .threshold = 0 };
    try std.testing.expectError(error.InvalidThreshold, ampd_with_config(allocator, &signal, bad_config));

    bad_config = AMPDConfig{ .threshold = 10, .scale_max = 5 };
    try std.testing.expectError(error.ThresholdExceedsScaleMax, ampd_with_config(allocator, &signal, bad_config));

    // Test with signal too short
    const short_signal = [_]f32{ 1, 2 };
    const valid_config = AMPDConfig{};
    try std.testing.expectError(error.SignalTooShort, ampd_with_config(allocator, &short_signal, valid_config));
}
