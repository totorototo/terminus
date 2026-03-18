const std = @import("std");

pub const AudioFrame = struct {
    t: f32, // normalized time [0, 1] — index-based, uniform
    pitch: f32, // from elevation, normalized [0, 1]
    intensity: f32, // from |slope|, normalized [0, 1]
    tempo: f32, // from slope rate-of-change (proxy for dynamism), normalized [0, 1]
    distance: f32, // cumulative distance, normalized [0, 1]
};

/// Generate audio frames from pre-computed trace arrays.
/// elevations: raw elevation values (trace.points[i][2])
/// distances:  cumulative distances in meters (trace.cumulativeDistances)
/// slopes:     slope percentages (trace.slopes, already smoothed)
/// All slices should have the same length; the minimum length is used.
/// Returns an empty slice for empty input. Caller owns the returned slice.
pub fn generateAudioFrames(
    allocator: std.mem.Allocator,
    elevations: []const f64,
    distances: []const f64,
    slopes: []const f64,
) ![]AudioFrame {
    const n = @min(elevations.len, @min(distances.len, slopes.len));
    if (n == 0) return try allocator.alloc(AudioFrame, 0);

    // ── Elevation range for pitch normalization ────────────────────────────────
    var min_elev = elevations[0];
    var max_elev = elevations[0];
    for (elevations[0..n]) |e| {
        if (e < min_elev) min_elev = e;
        if (e > max_elev) max_elev = e;
    }

    // ── Max |slope| for intensity normalization ────────────────────────────────
    var max_slope_abs: f64 = 0.0;
    for (slopes[0..n]) |s| {
        const a = @abs(s);
        if (a > max_slope_abs) max_slope_abs = a;
    }

    // ── Slope rate-of-change for tempo (centered finite difference) ────────────
    // Measures how rapidly the gradient is changing — steep, dynamic sections
    // (e.g. cliff faces, switchbacks) get a high tempo value.
    const slope_changes = try allocator.alloc(f64, n);
    defer allocator.free(slope_changes);

    slope_changes[0] = 0.0;
    if (n > 1) {
        slope_changes[n - 1] = 0.0;
        for (1..n - 1) |i| {
            slope_changes[i] = @abs(slopes[i + 1] - slopes[i - 1]) * 0.5;
        }
    }

    var max_slope_change: f64 = 0.0;
    for (slope_changes) |sc| {
        if (sc > max_slope_change) max_slope_change = sc;
    }

    // ── Normalization denominators (guard against flat/degenerate routes) ──────
    const total_dist = distances[n - 1];
    const elev_range: f64 = if (max_elev > min_elev) max_elev - min_elev else 1.0;
    const slope_range: f64 = if (max_slope_abs > 0.0) max_slope_abs else 1.0;
    const change_range: f64 = if (max_slope_change > 0.0) max_slope_change else 1.0;

    // ── Build frames ───────────────────────────────────────────────────────────
    const frames = try allocator.alloc(AudioFrame, n);
    errdefer allocator.free(frames);

    for (0..n) |i| {
        const t: f32 = if (n > 1)
            @floatCast(@as(f64, @floatFromInt(i)) / @as(f64, @floatFromInt(n - 1)))
        else
            0.0;

        frames[i] = AudioFrame{
            .t = t,
            .pitch = @floatCast((elevations[i] - min_elev) / elev_range),
            .intensity = @floatCast(@abs(slopes[i]) / slope_range),
            .tempo = @floatCast(slope_changes[i] / change_range),
            .distance = if (total_dist > 0.0) @floatCast(distances[i] / total_dist) else 0.0,
        };
    }

    return frames;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test "generateAudioFrames: empty input returns empty slice" {
    const allocator = std.testing.allocator;

    const frames = try generateAudioFrames(allocator, &.{}, &.{}, &.{});
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 0), frames.len);
}

test "generateAudioFrames: single point" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{500.0};
    const distances = [_]f64{0.0};
    const slopes = [_]f64{0.0};

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 1), frames.len);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].t, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].pitch, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].intensity, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].distance, 0.001);
}

test "generateAudioFrames: all values are normalized to [0, 1]" {
    const allocator = std.testing.allocator;

    // 5 points: climb then descent
    const elevations = [_]f64{ 100.0, 200.0, 300.0, 250.0, 150.0 };
    const distances = [_]f64{ 0.0, 1000.0, 2000.0, 3000.0, 4000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 10.0, -5.0, -8.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 5), frames.len);

    for (frames) |f| {
        try std.testing.expect(f.t >= 0.0 and f.t <= 1.0);
        try std.testing.expect(f.pitch >= 0.0 and f.pitch <= 1.0);
        try std.testing.expect(f.intensity >= 0.0 and f.intensity <= 1.0);
        try std.testing.expect(f.tempo >= 0.0 and f.tempo <= 1.0);
        try std.testing.expect(f.distance >= 0.0 and f.distance <= 1.0);
    }
}

test "generateAudioFrames: pitch maps elevation correctly" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0 };
    const distances = [_]f64{ 0.0, 1000.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 5.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    // Lowest elevation → pitch 0.0, highest → pitch 1.0
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].pitch, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.5), frames[1].pitch, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 1.0), frames[2].pitch, 0.001);
}

test "generateAudioFrames: distance normalized to total" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0, 400.0 };
    const distances = [_]f64{ 0.0, 500.0, 1500.0, 3000.0 };
    const slopes = [_]f64{ 0.0, 2.0, 4.0, 2.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].distance, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 500.0 / 3000.0), frames[1].distance, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 1500.0 / 3000.0), frames[2].distance, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 1.0), frames[3].distance, 0.001);
}

test "generateAudioFrames: t is uniform index-based" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0, 400.0, 500.0 };
    const distances = [_]f64{ 0.0, 100.0, 500.0, 900.0, 1000.0 }; // non-uniform spacing
    const slopes = [_]f64{ 0.0, 1.0, 2.0, 3.0, 4.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    // t must be uniformly spaced regardless of distance spacing
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].t, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.25), frames[1].t, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.5), frames[2].t, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.75), frames[3].t, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 1.0), frames[4].t, 0.001);
}

test "generateAudioFrames: flat terrain (no elevation change)" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 200.0, 200.0, 200.0, 200.0 };
    const distances = [_]f64{ 0.0, 1000.0, 2000.0, 3000.0 };
    const slopes = [_]f64{ 0.0, 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    // All pitches and intensities should be 0 on flat terrain
    for (frames) |f| {
        try std.testing.expectApproxEqAbs(@as(f32, 0.0), f.pitch, 0.001);
        try std.testing.expectApproxEqAbs(@as(f32, 0.0), f.intensity, 0.001);
    }
}

test "generateAudioFrames: intensity peaks at steepest slope" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 150.0, 250.0, 220.0, 200.0 };
    const distances = [_]f64{ 0.0, 500.0, 1000.0, 1500.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 20.0, -6.0, -4.0 }; // steepest at index 2

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    // Index 2 has highest |slope| (20%), so intensity[2] == 1.0
    try std.testing.expectApproxEqAbs(@as(f32, 1.0), frames[2].intensity, 0.001);
}

test "generateAudioFrames: mismatched lengths uses minimum" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0 };
    const distances = [_]f64{ 0.0, 1000.0 }; // shorter
    const slopes = [_]f64{ 0.0, 5.0, 10.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 2), frames.len);
}

test "generateAudioFrames: no memory leak" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 150.0, 200.0, 180.0, 160.0 };
    const distances = [_]f64{ 0.0, 500.0, 1000.0, 1500.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 3.0, 5.0, -4.0, -2.0 };

    for (0..10) |_| {
        const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes);
        allocator.free(frames);
    }
    // test allocator catches any leaks
}
