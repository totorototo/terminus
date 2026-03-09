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

/// For each peak, find the preceding valley (lowest point between the previous
/// peak and this one) and compute climb statistics.
/// Caller owns the returned slice.
pub fn detectClimbs(
    allocator: std.mem.Allocator,
    peaks: []const usize,
    points: []const [3]f64,
    cumulative_distances: []const f64,
) ![]ClimbStats {
    if (peaks.len == 0 or points.len == 0 or cumulative_distances.len == 0) return &.{};

    var climbs = std.ArrayList(ClimbStats){};
    defer climbs.deinit(allocator);

    for (0..peaks.len) |i| {
        const peak_idx = peaks[i];
        const search_start: usize = if (i == 0) 0 else peaks[i - 1];

        if (peak_idx >= points.len or peak_idx >= cumulative_distances.len) continue;
        if (search_start >= peak_idx) continue;

        // Find the lowest elevation point between search_start and peak_idx (inclusive)
        var valley_idx = search_start;
        var valley_elev = points[search_start][2];

        for (search_start..peak_idx + 1) |j| {
            const elev = points[j][2];
            if (elev < valley_elev) {
                valley_elev = elev;
                valley_idx = j;
            }
        }

        const start_dist = cumulative_distances[valley_idx];
        const end_dist = cumulative_distances[peak_idx];
        const climb_dist = if (end_dist > start_dist) end_dist - start_dist else 0.0;

        const summit_elev = points[peak_idx][2];
        const elev_gain = if (summit_elev > valley_elev) summit_elev - valley_elev else 0.0;
        const avg_gradient = if (climb_dist > 0.0) (elev_gain / climb_dist) * 100.0 else 0.0;

        try climbs.append(allocator, ClimbStats{
            .startIndex = valley_idx,
            .endIndex = peak_idx,
            .startDistM = start_dist,
            .climbDistM = climb_dist,
            .elevationGain = elev_gain,
            .summitElev = summit_elev,
            .avgGradient = avg_gradient,
        });
    }

    return try climbs.toOwnedSlice(allocator);
}

test "detectClimbs: empty inputs" {
    const allocator = std.testing.allocator;

    const climbs1 = try detectClimbs(allocator, &.{}, &.{}, &.{});
    try std.testing.expectEqual(@as(usize, 0), climbs1.len);

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.0, 0.001, 200.0 },
    };
    const dists = [_]f64{ 0.0, 111.0 };
    const climbs2 = try detectClimbs(allocator, &.{}, points[0..], dists[0..]);
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

    const climbs = try detectClimbs(allocator, peaks[0..], points[0..], dists[0..]);
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

    const climbs = try detectClimbs(allocator, peaks[0..], points[0..], dists[0..]);
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

    const climbs = try detectClimbs(allocator, peaks[0..], points[0..], dists[0..]);
    try std.testing.expectEqual(@as(usize, 0), climbs.len);
}
