const std = @import("std");

pub const AudioFrame = struct {
    t: f32, // normalized time [0, 1] — index-based, uniform
    distance: f32, // cumulative distance, normalized [0, 1]
    pitch: f32, // from elevation, normalized [0, 1] → oscillator frequency + reverb mix
    intensity: f32, // from |slope|, normalized [0, 1] → gain
    timbre: f32, // from signed slope, normalized [0, 1] (0=steep descent, 0.5=flat, 1=steep ascent) → filter Q
    bearing: f32, // section bearing in degrees [0, 360) → HRTF spatial position
    pace: f32, // section pace normalized [0, 1] (0=fastest, 1=slowest) → LFO tremolo rate
};

/// Generate audio frames from pre-computed trace arrays and per-point section data.
/// elevations: raw elevation values (trace.points[i][2])
/// distances:  cumulative distances in meters (trace.cumulativeDistances)
/// slopes:     slope percentages (trace.slopes, already smoothed)
/// bearings:   per-point section bearing in degrees (0 if no section data)
/// paces:      per-point section pace in s/m (0 if no section data)
/// All slices should have the same length; the minimum length is used.
/// Returns an empty slice for empty input. Caller owns the returned slice.
pub fn generateAudioFrames(
    allocator: std.mem.Allocator,
    elevations: []const f64,
    distances: []const f64,
    slopes: []const f64,
    bearings: []const f64,
    paces: []const f64,
) ![]AudioFrame {
    const n = @min(elevations.len, @min(distances.len, @min(slopes.len, @min(bearings.len, paces.len))));
    if (n == 0) return try allocator.alloc(AudioFrame, 0);

    // ── Elevation range for pitch normalization ────────────────────────────────
    var min_elev = elevations[0];
    var max_elev = elevations[0];
    for (elevations[0..n]) |e| {
        if (e < min_elev) min_elev = e;
        if (e > max_elev) max_elev = e;
    }

    // ── Max |slope| for intensity + timbre normalization ──────────────────────
    var max_slope_abs: f64 = 0.0;
    for (slopes[0..n]) |s| {
        const a = @abs(s);
        if (a > max_slope_abs) max_slope_abs = a;
    }

    // ── Pace range for LFO normalization ──────────────────────────────────────
    var min_pace: f64 = std.math.floatMax(f64);
    var max_pace: f64 = 0.0;
    for (paces[0..n]) |p| {
        if (p > 0.0) {
            if (p < min_pace) min_pace = p;
            if (p > max_pace) max_pace = p;
        }
    }
    // If no section data (all zeros), treat as uniform mid-pace
    const has_pace = max_pace > 0.0;

    // ── Normalization denominators (guard against flat/degenerate routes) ──────
    const total_dist = distances[n - 1];
    const elev_range: f64 = if (max_elev > min_elev) max_elev - min_elev else 1.0;
    const slope_range: f64 = if (max_slope_abs > 0.0) max_slope_abs else 1.0;
    const pace_range: f64 = if (has_pace and max_pace > min_pace) max_pace - min_pace else 1.0;
    const pace_base: f64 = if (has_pace) min_pace else 0.0;

    // ── Build frames ───────────────────────────────────────────────────────────
    const frames = try allocator.alloc(AudioFrame, n);
    errdefer allocator.free(frames);

    for (0..n) |i| {
        const t: f32 = if (n > 1)
            @floatCast(@as(f64, @floatFromInt(i)) / @as(f64, @floatFromInt(n - 1)))
        else
            0.0;

        // timbre: signed slope → [0, 1], 0.5 = flat, >0.5 = ascending, <0.5 = descending
        const timbre: f32 = @floatCast((slopes[i] / slope_range) * 0.5 + 0.5);

        // pace: 0 = fastest (short estimatedDuration/distance), 1 = slowest
        const pace: f32 = if (has_pace and paces[i] > 0.0)
            @floatCast((paces[i] - pace_base) / pace_range)
        else
            0.5;

        frames[i] = AudioFrame{
            .t = t,
            .distance = if (total_dist > 0.0) @floatCast(distances[i] / total_dist) else 0.0,
            .pitch = @floatCast((elevations[i] - min_elev) / elev_range),
            .intensity = @floatCast(@abs(slopes[i]) / slope_range),
            .timbre = std.math.clamp(timbre, 0.0, 1.0),
            .bearing = @floatCast(bearings[i]),
            .pace = std.math.clamp(pace, 0.0, 1.0),
        };
    }

    return frames;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test "generateAudioFrames: empty input returns empty slice" {
    const allocator = std.testing.allocator;

    const frames = try generateAudioFrames(allocator, &.{}, &.{}, &.{}, &.{}, &.{});
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 0), frames.len);
}

test "generateAudioFrames: single point" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{500.0};
    const distances = [_]f64{0.0};
    const slopes = [_]f64{0.0};
    const bearings = [_]f64{0.0};
    const paces = [_]f64{0.0};

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 1), frames.len);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].t, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].pitch, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].intensity, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].distance, 0.001);
}

test "generateAudioFrames: all values are normalized" {
    const allocator = std.testing.allocator;

    // 5 points: climb then descent, section bearing 45°, varying pace
    const elevations = [_]f64{ 100.0, 200.0, 300.0, 250.0, 150.0 };
    const distances = [_]f64{ 0.0, 1000.0, 2000.0, 3000.0, 4000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 10.0, -5.0, -8.0 };
    const bearings = [_]f64{ 45.0, 45.0, 90.0, 180.0, 270.0 };
    const paces = [_]f64{ 600.0, 720.0, 900.0, 480.0, 540.0 }; // s/km (converted to s/m in practice)

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 5), frames.len);

    for (frames) |f| {
        try std.testing.expect(f.t >= 0.0 and f.t <= 1.0);
        try std.testing.expect(f.pitch >= 0.0 and f.pitch <= 1.0);
        try std.testing.expect(f.intensity >= 0.0 and f.intensity <= 1.0);
        try std.testing.expect(f.timbre >= 0.0 and f.timbre <= 1.0);
        try std.testing.expect(f.pace >= 0.0 and f.pace <= 1.0);
        // bearing is raw degrees — not normalized to [0, 1]
        try std.testing.expect(f.bearing >= 0.0 and f.bearing < 360.0);
    }
}

test "generateAudioFrames: pitch maps elevation correctly" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0 };
    const distances = [_]f64{ 0.0, 1000.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 5.0 };
    const bearings = [_]f64{ 0.0, 0.0, 0.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
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
    const bearings = [_]f64{ 0.0, 0.0, 0.0, 0.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
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
    const bearings = [_]f64{ 0.0, 0.0, 0.0, 0.0, 0.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
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
    const bearings = [_]f64{ 90.0, 90.0, 90.0, 90.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    // Flat terrain: pitch and intensity both 0, timbre is 0.5 (flat), pace defaults to 0.5
    for (frames) |f| {
        try std.testing.expectApproxEqAbs(@as(f32, 0.0), f.pitch, 0.001);
        try std.testing.expectApproxEqAbs(@as(f32, 0.0), f.intensity, 0.001);
        try std.testing.expectApproxEqAbs(@as(f32, 0.5), f.timbre, 0.001);
        try std.testing.expectApproxEqAbs(@as(f32, 0.5), f.pace, 0.001);
    }
}

test "generateAudioFrames: intensity peaks at steepest slope" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 150.0, 250.0, 220.0, 200.0 };
    const distances = [_]f64{ 0.0, 500.0, 1000.0, 1500.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 20.0, -6.0, -4.0 }; // steepest at index 2
    const bearings = [_]f64{ 0.0, 0.0, 0.0, 0.0, 0.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    // Index 2 has highest |slope| (20%), so intensity[2] == 1.0
    try std.testing.expectApproxEqAbs(@as(f32, 1.0), frames[2].intensity, 0.001);
}

test "generateAudioFrames: timbre is 0.5 on flat, >0.5 ascending, <0.5 descending" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0, 200.0, 100.0 };
    const distances = [_]f64{ 0.0, 500.0, 1000.0, 1500.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 10.0, 10.0, -10.0, -10.0 };
    const bearings = [_]f64{ 0.0, 0.0, 0.0, 0.0, 0.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    try std.testing.expectApproxEqAbs(@as(f32, 0.5), frames[0].timbre, 0.001); // flat (slope=0)
    try std.testing.expect(frames[1].timbre > 0.5); // ascending
    try std.testing.expect(frames[3].timbre < 0.5); // descending
}

test "generateAudioFrames: bearing passes through raw degrees" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0 };
    const distances = [_]f64{ 0.0, 1000.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 5.0 };
    const bearings = [_]f64{ 0.0, 90.0, 270.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].bearing, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 90.0), frames[1].bearing, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 270.0), frames[2].bearing, 0.001);
}

test "generateAudioFrames: pace normalized across sections" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0, 200.0 };
    const distances = [_]f64{ 0.0, 1000.0, 2000.0, 3000.0 };
    const slopes = [_]f64{ 0.0, 5.0, 5.0, -5.0 };
    const bearings = [_]f64{ 0.0, 0.0, 0.0, 0.0 };
    // Pace in s/m: 0.3 = fast, 0.6 = slow — spread across two sections
    const paces = [_]f64{ 0.3, 0.3, 0.6, 0.6 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    // Fastest pace → 0.0, slowest → 1.0
    try std.testing.expectApproxEqAbs(@as(f32, 0.0), frames[0].pace, 0.001);
    try std.testing.expectApproxEqAbs(@as(f32, 1.0), frames[2].pace, 0.001);
}

test "generateAudioFrames: mismatched lengths uses minimum" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 200.0, 300.0 };
    const distances = [_]f64{ 0.0, 1000.0 }; // shorter
    const slopes = [_]f64{ 0.0, 5.0, 10.0 };
    const bearings = [_]f64{ 0.0, 0.0, 0.0 };
    const paces = [_]f64{ 0.0, 0.0, 0.0 };

    const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
    defer allocator.free(frames);

    try std.testing.expectEqual(@as(usize, 2), frames.len);
}

test "generateAudioFrames: no memory leak" {
    const allocator = std.testing.allocator;

    const elevations = [_]f64{ 100.0, 150.0, 200.0, 180.0, 160.0 };
    const distances = [_]f64{ 0.0, 500.0, 1000.0, 1500.0, 2000.0 };
    const slopes = [_]f64{ 0.0, 3.0, 5.0, -4.0, -2.0 };
    const bearings = [_]f64{ 45.0, 45.0, 90.0, 135.0, 180.0 };
    const paces = [_]f64{ 0.5, 0.5, 0.8, 0.4, 0.4 };

    for (0..10) |_| {
        const frames = try generateAudioFrames(allocator, &elevations, &distances, &slopes, &bearings, &paces);
        allocator.free(frames);
    }
    // test allocator catches any leaks
}
