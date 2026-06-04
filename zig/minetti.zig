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

/// Fatigue coefficient for the exponential fatigue model.
/// Calibrated for ultra-trail races (≥ 100km, 6000m+ D+):
///   d_eff ≈ 234km on a 224km/8000D+/9000D- course
///   fatigueFactor at finish = exp(0.0035 × 234) ≈ 2.27
/// Use 0.012 for 50km races, 0.0035 for 200km+.
pub const K_FATIGUE: f64 = 0.0035;

/// Non-linear (exponential) fatigue multiplier.
/// d_eff_km: cumulative effort-weighted distance in km.
/// k: fatigue coefficient (K_FATIGUE).
/// Returns a multiplier ≥ 1.0 applied to base pace.
/// More realistic than the linear model (1 + k·d): late-race slowdown accelerates
/// rather than growing at a constant rate.
pub fn fatigueFactor(d_eff_km: f64, k: f64) f64 {
    return @exp(k * d_eff_km);
}

/// Fraction of accumulated effort distance recovered when a runner reaches a LifeBase.
/// 0.20 = 20% of d_eff is shed — reflects mandatory rest and resupply at major checkpoints.
pub const RECOVERY_LIFE_BASE: f64 = 0.20;

/// Default flat-terrain pace used when no user pace is provided.
/// 530 s/km = 8:50/km — calibrated for ultra-trail (VMA ~14-15 km/h, races ≥ 100km).
pub const DEFAULT_BASE_PACE_S_PER_KM: f64 = 530.0;

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

test "fatigueFactor: zero effort returns 1.0" {
    try std.testing.expectApproxEqAbs(1.0, fatigueFactor(0.0, K_FATIGUE), 1e-9);
}

test "fatigueFactor: grows faster than linear model" {
    // At d_eff = 100km: exp(0.35) ≈ 1.419 vs linear 1.35
    const d: f64 = 100.0;
    const linear = 1.0 + K_FATIGUE * d;
    try std.testing.expect(fatigueFactor(d, K_FATIGUE) > linear);
}

test "fatigueFactor: ultra finish ≈ 2.27 at 234km effort" {
    // exp(0.0035 × 234) ≈ 2.27
    try std.testing.expectApproxEqAbs(2.27, fatigueFactor(234.0, K_FATIGUE), 0.01);
}

test "RECOVERY_LIFE_BASE: is between 0 and 1" {
    try std.testing.expect(RECOVERY_LIFE_BASE > 0.0);
    try std.testing.expect(RECOVERY_LIFE_BASE < 1.0);
}
