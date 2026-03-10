const std = @import("std");

pub const ClimbStats = struct {
    startIndex: usize,
    endIndex: usize,
    startDistM: f64,
    climbDistM: f64,
    elevationGain: f64,
    summitElev: f64,
    avgGradient: f64, // percentage
};

/// Garmin climb qualification thresholds.
/// A climb is counted only when ALL three conditions hold:
///   score       = climbDistM × avgGradient  > 3 500
///   climbDistM  >= 500 m
///   avgGradient >= 3 %
const MIN_CLIMB_SCORE: f64 = 3_500.0; // m × %
const MIN_CLIMB_DIST_M: f64 = 500.0;
const MIN_AVG_GRADIENT: f64 = 3.0; // %

fn qualifiesAsClimb(dist_m: f64, avg_gradient: f64) bool {
    return dist_m >= MIN_CLIMB_DIST_M and
        avg_gradient >= MIN_AVG_GRADIENT and
        dist_m * avg_gradient > MIN_CLIMB_SCORE;
}

/// For each peak, find the nearest preceding valley (from the AMPD-detected valleys list)
/// and compute climb statistics. Falls back to index 0 when no valley precedes a peak.
/// Both `peaks` and `valleys` must be sorted ascending. Caller owns the returned slice.
pub fn detectClimbs(
    allocator: std.mem.Allocator,
    peaks: []const usize,
    valleys: []const usize,
    points: []const [3]f64,
    cumulative_distances: []const f64,
) ![]ClimbStats {
    if (peaks.len == 0 or points.len == 0 or cumulative_distances.len == 0) return &.{};

    var climbs = std.ArrayList(ClimbStats){};
    defer climbs.deinit(allocator);

    // Walk both sorted slices together: for each peak, advance valley_cursor
    // until valleys[valley_cursor] is the last valley strictly before peak_idx.
    var valley_cursor: usize = 0;
    // A valley is only valid if it comes after the previous emitted climb's peak.
    // This guarantees no two climbs share the same startIndex (no overlapping ranges).
    var min_valley_start: usize = 0;

    for (peaks) |peak_idx| {
        if (peak_idx >= points.len or peak_idx >= cumulative_distances.len) continue;

        // Advance past all valleys that are still before this peak
        while (valley_cursor + 1 < valleys.len and valleys[valley_cursor + 1] < peak_idx) {
            valley_cursor += 1;
        }

        // Use the detected valley if it precedes this peak, otherwise fall back to index 0
        const valley_idx = if (valleys.len > 0 and valleys[valley_cursor] < peak_idx)
            valleys[valley_cursor]
        else
            0;

        // Skip if this valley was already claimed by a previous climb (no shared start)
        if (valley_idx < min_valley_start) continue;

        if (valley_idx >= peak_idx) continue;

        const valley_elev = points[valley_idx][2];
        const start_dist = cumulative_distances[valley_idx];
        const end_dist = cumulative_distances[peak_idx];
        const climb_dist = if (end_dist > start_dist) end_dist - start_dist else 0.0;

        const summit_elev = points[peak_idx][2];
        const elev_gain = if (summit_elev > valley_elev) summit_elev - valley_elev else 0.0;
        const avg_gradient = if (climb_dist > 0.0) (elev_gain / climb_dist) * 100.0 else 0.0;

        if (!qualifiesAsClimb(climb_dist, avg_gradient)) continue;

        try climbs.append(allocator, ClimbStats{
            .startIndex = valley_idx,
            .endIndex = peak_idx,
            .startDistM = start_dist,
            .climbDistM = climb_dist,
            .elevationGain = elev_gain,
            .summitElev = summit_elev,
            .avgGradient = avg_gradient,
        });
        // Valley is now consumed; subsequent climbs must start after this peak
        min_valley_start = peak_idx;
    }

    return try climbs.toOwnedSlice(allocator);
}

test "detectClimbs: empty inputs" {
    const allocator = std.testing.allocator;

    const climbs1 = try detectClimbs(allocator, &.{}, &.{}, &.{}, &.{});
    try std.testing.expectEqual(@as(usize, 0), climbs1.len);

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.0, 0.001, 200.0 },
    };
    const dists = [_]f64{ 0.0, 111.0 };
    const climbs2 = try detectClimbs(allocator, &.{}, &.{}, points[0..], dists[0..]);
    try std.testing.expectEqual(@as(usize, 0), climbs2.len);
}

test "detectClimbs: single peak from valley" {
    const allocator = std.testing.allocator;

    // Valley at 0 (100m), peak at 4 (500m)
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 }, // 0: valley
        [3]f64{ 0.0, 0.1, 200.0 }, // 1
        [3]f64{ 0.0, 0.2, 350.0 }, // 2
        [3]f64{ 0.0, 0.3, 450.0 }, // 3
        [3]f64{ 0.0, 0.4, 500.0 }, // 4: peak
    };
    const dists = [_]f64{ 0.0, 1000.0, 2000.0, 3000.0, 4000.0 };
    const peaks = [_]usize{4};
    // valley at idx 0 is the lowest point before the peak
    const valleys = [_]usize{0};

    const climbs = try detectClimbs(allocator, peaks[0..], valleys[0..], points[0..], dists[0..]);
    defer allocator.free(climbs);

    try std.testing.expectEqual(@as(usize, 1), climbs.len);
    try std.testing.expectEqual(@as(usize, 0), climbs[0].startIndex);
    try std.testing.expectEqual(@as(usize, 4), climbs[0].endIndex);
    try std.testing.expectApproxEqAbs(4000.0, climbs[0].climbDistM, 0.1);
    try std.testing.expectApproxEqAbs(400.0, climbs[0].elevationGain, 0.1);
    try std.testing.expectApproxEqAbs(500.0, climbs[0].summitElev, 0.1);
    // avgGradient = 400 / 4000 * 100 = 10%
    try std.testing.expectApproxEqAbs(10.0, climbs[0].avgGradient, 0.1);
}

test "detectClimbs: valley is not at previous peak" {
    const allocator = std.testing.allocator;

    // First peak at idx 2, second peak at idx 6
    // Between idx 2 and idx 6, the valley is at idx 4 (80m), not at idx 2 (300m)
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 }, // 0
        [3]f64{ 0.0, 0.1, 200.0 }, // 1
        [3]f64{ 0.0, 0.2, 300.0 }, // 2: first peak
        [3]f64{ 0.0, 0.3, 150.0 }, // 3
        [3]f64{ 0.0, 0.4, 80.0 }, // 4: valley between peaks
        [3]f64{ 0.0, 0.5, 200.0 }, // 5
        [3]f64{ 0.0, 0.6, 400.0 }, // 6: second peak
    };
    const dists = [_]f64{ 0.0, 1000.0, 2000.0, 3000.0, 4000.0, 5000.0, 6000.0 };
    const peaks = [_]usize{ 2, 6 };
    // AMPD detects valley at idx 0 (before first peak) and idx 4 (between peaks)
    const valleys = [_]usize{ 0, 4 };

    const climbs = try detectClimbs(allocator, peaks[0..], valleys[0..], points[0..], dists[0..]);
    defer allocator.free(climbs);

    try std.testing.expectEqual(@as(usize, 2), climbs.len);

    // Second climb: valley at idx 4 (80m elevation), peak at idx 6 (400m)
    try std.testing.expectEqual(@as(usize, 4), climbs[1].startIndex);
    try std.testing.expectEqual(@as(usize, 6), climbs[1].endIndex);
    try std.testing.expectApproxEqAbs(320.0, climbs[1].elevationGain, 0.1);
    try std.testing.expectApproxEqAbs(400.0, climbs[1].summitElev, 0.1);
}

test "detectClimbs: out of bounds peak index is skipped" {
    const allocator = std.testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.0, 0.1, 200.0 },
    };
    const dists = [_]f64{ 0.0, 1000.0 };
    const peaks = [_]usize{99}; // out of bounds

    const climbs = try detectClimbs(allocator, peaks[0..], &.{}, points[0..], dists[0..]);
    try std.testing.expectEqual(@as(usize, 0), climbs.len);
}

test "detectClimbs: two peaks share same valley produces only one climb" {
    const allocator = std.testing.allocator;

    // Valley at 0, then two qualifying peaks with NO valley between them.
    // Without the min_valley_start guard both peaks would map to valley 0,
    // producing overlapping climbs (the bug that caused "two climbs in progress").
    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 }, // 0: valley
        [3]f64{ 0.0, 0.1, 200.0 }, // 1
        [3]f64{ 0.0, 0.2, 600.0 }, // 2: peak A  (qualifies: 2000m × 25% = 50000)
        [3]f64{ 0.0, 0.3, 580.0 }, // 3: slight dip, not a detected valley
        [3]f64{ 0.0, 0.4, 700.0 }, // 4: peak B
    };
    const dists = [_]f64{ 0.0, 500.0, 2000.0, 2500.0, 4000.0 };
    const peaks = [_]usize{ 2, 4 };
    // No valley detected between peaks: only valley at 0
    const valleys = [_]usize{0};

    const climbs = try detectClimbs(allocator, peaks[0..], valleys[0..], points[0..], dists[0..]);
    defer allocator.free(climbs);

    // Only the first peak can claim valley 0; second peak has no valid valley → 1 climb
    try std.testing.expectEqual(@as(usize, 1), climbs.len);
    try std.testing.expectEqual(@as(usize, 0), climbs[0].startIndex);
    try std.testing.expectEqual(@as(usize, 2), climbs[0].endIndex);
}

test "detectClimbs: Garmin qualification filter" {
    const allocator = std.testing.allocator;

    // Six valley→peak segments, only the last qualifies.
    // Rejection reasons:
    //   A: dist=400m  < 500m  (too short)
    //   B: grad=1.67% < 3%    (too shallow)
    //   C: score=1500 ≤ 3500  (500m × 3%)
    //   D: score=3000 ≤ 3500  (600m × 5%)
    //   E: score=3500 ≤ 3500  (700m × 5%, exactly at boundary → excluded)
    //   F: score=4800 > 3500  ✓ (800m × 6%)
    //
    // Valleys at even indices {0,2,4,6,8,10}, peaks at odd indices {1,3,5,7,9,11}.
    const points = [_][3]f64{
        .{ 0.0, 0.0, 0.0 }, //  0 valley
        .{ 0.0, 0.1, 20.0 }, //  1 peak A: 400m dist, 20m → 5%, score=2000
        .{ 0.0, 0.2, 0.0 }, //  2 valley
        .{ 0.0, 0.3, 10.0 }, //  3 peak B: 600m dist, 10m → 1.67%, score=1000
        .{ 0.0, 0.4, 0.0 }, //  4 valley
        .{ 0.0, 0.5, 15.0 }, //  5 peak C: 500m dist, 15m → 3%, score=1500
        .{ 0.0, 0.6, 0.0 }, //  6 valley
        .{ 0.0, 0.7, 30.0 }, //  7 peak D: 600m dist, 30m → 5%, score=3000
        .{ 0.0, 0.8, 0.0 }, //  8 valley
        .{ 0.0, 0.9, 35.0 }, //  9 peak E: 700m dist, 35m → 5%, score=3500 (not > 3500)
        .{ 0.0, 1.0, 0.0 }, // 10 valley
        .{ 0.0, 1.1, 48.0 }, // 11 peak F: 800m dist, 48m → 6%, score=4800 ✓
    };
    const dists = [_]f64{
        0.0, //  0 valley
        400.0, //  1 peak A  (Δ=400m from valley 0)
        800.0, //  2 valley
        1400.0, //  3 peak B  (Δ=600m from valley 2)
        1800.0, //  4 valley
        2300.0, //  5 peak C  (Δ=500m from valley 4)
        2700.0, //  6 valley
        3300.0, //  7 peak D  (Δ=600m from valley 6)
        3700.0, //  8 valley
        4400.0, //  9 peak E  (Δ=700m from valley 8)
        4800.0, // 10 valley
        5600.0, // 11 peak F  (Δ=800m from valley 10)
    };
    const peaks = [_]usize{ 1, 3, 5, 7, 9, 11 };
    const valleys = [_]usize{ 0, 2, 4, 6, 8, 10 };

    const climbs = try detectClimbs(allocator, peaks[0..], valleys[0..], points[0..], dists[0..]);
    defer allocator.free(climbs);

    // Only climb F qualifies
    try std.testing.expectEqual(@as(usize, 1), climbs.len);
    try std.testing.expectEqual(@as(usize, 10), climbs[0].startIndex);
    try std.testing.expectEqual(@as(usize, 11), climbs[0].endIndex);
    try std.testing.expectApproxEqAbs(48.0, climbs[0].summitElev, 0.1);
    try std.testing.expectApproxEqAbs(800.0, climbs[0].climbDistM, 0.1);
    try std.testing.expectApproxEqAbs(6.0, climbs[0].avgGradient, 0.01);
}
