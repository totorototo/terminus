const std = @import("std");

/// Metabolic cost polynomial from Minetti et al. (2002), J. Exp. Biol.
///
/// Returns the energy cost of running in J·kg⁻¹·m⁻¹ for a given slope.
/// slope = rise / run (fraction, not percent).  Domain: [−0.45, +0.45].
/// Values outside the domain are clamped — the model is not reliable beyond ±45%.
///
/// Key values:
///   slope =  0.00 → 3.6  (flat baseline)
///   slope = -0.10 → ~2.8 (gentle descent, cheapest terrain)
///   slope = +0.10 → ~6.0 (moderate climb, ×1.67 flat)
///   slope = +0.20 → ~9.8 (steep climb, ×2.72 flat)
pub fn cmet(slope: f64) f64 {
    const i = std.math.clamp(slope, -0.45, 0.45);
    const sq = i * i;
    const cu = sq * i;
    const qu = cu * i;
    const qi = qu * i;
    return 155.4 * qi - 30.4 * qu - 43.3 * cu + 46.3 * sq + 19.5 * i + 3.6;
}

/// Metabolic cost at zero slope — the denominator for pace_factor.
pub const CMET_FLAT: f64 = 3.6;

/// Pace factor relative to flat terrain.
///
/// pace_factor = Cmet(slope) / Cmet(0).
/// Multiply a runner's flat pace by this to get the equivalent effort pace on this slope.
/// Examples:
///   slope =  0.00 → 1.00  (flat, no adjustment)
///   slope = +0.10 → ~1.67 (run a 5:00/km at 5:00 × 1.67 = 8:21/km effort)
///   slope = -0.10 → ~0.78 (gentle descent, cheaper than flat)
pub fn paceFactor(slope: f64) f64 {
    return cmet(slope) / CMET_FLAT;
}

/// Fatigue coefficient (empirical, Minetti-extended model).
/// Each 1 000 m of effort-weighted distance (d_eff) adds K_FATIGUE to the fatigue factor.
/// Calibrated for ultra-trail races (≥ 100km, 6000m+ D+):
///   d_eff ≈ 234km on a 224km/8000D+/9000D- course
///   fatigue_factor at finish = 1 + 0.004 × 234 = 1.94
/// Use 0.012 for 50km races, 0.004 for 200km+.
pub const K_FATIGUE: f64 = 0.004;

/// Default flat-terrain pace used when no user pace is provided.
/// 490 s/km = 8:10/km — calibrated for ultra-trail (VMA ~14-15 km/h, races ≥ 100km).
pub const DEFAULT_BASE_PACE_S_PER_KM: f64 = 490.0;

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

test "cmet: flat terrain returns 3.6" {
    try std.testing.expectApproxEqAbs(3.6, cmet(0.0), 1e-9);
}

test "cmet: gentle descent costs less than flat" {
    try std.testing.expect(cmet(-0.10) < CMET_FLAT);
}

test "cmet: climbs cost progressively more" {
    try std.testing.expect(cmet(0.10) > cmet(0.05));
    try std.testing.expect(cmet(0.20) > cmet(0.10));
    try std.testing.expect(cmet(0.30) > cmet(0.20));
}

test "cmet: steep descent recovers (costs more than gentle descent)" {
    // Below ~-15% the eccentric braking cost rises again
    try std.testing.expect(cmet(-0.40) > cmet(-0.15));
}

test "cmet: clamps at domain boundaries" {
    // Values outside ±45% should equal the boundary value
    try std.testing.expectApproxEqAbs(cmet(-0.45), cmet(-0.99), 1e-9);
    try std.testing.expectApproxEqAbs(cmet(0.45), cmet(0.99), 1e-9);
}

test "paceFactor: flat returns 1.0" {
    try std.testing.expectApproxEqAbs(1.0, paceFactor(0.0), 1e-9);
}

test "paceFactor: +10% slope ≈ 1.67" {
    // Table value from Minetti (2002): ×1.67 at +10%
    try std.testing.expectApproxEqAbs(1.67, paceFactor(0.10), 0.05);
}

test "paceFactor: gentle descent < 1.0" {
    try std.testing.expect(paceFactor(-0.10) < 1.0);
}
