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

/// Default fatigue coefficient for the exponential fatigue model.
/// Matches the "Moderate" UI preset. On a 224km/8000D+ course (d_eff ≈ 234km):
///   fatigueFactor at finish = exp(0.002 × 234) ≈ 1.60
/// Preset scale: Low=0.001, Moderate=0.002, High=0.003, Very high=0.004.
pub const K_FATIGUE: f64 = 0.002;

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

/// Circadian rhythm slowdown factor based on UTC time-of-day.
/// unix_time_s: estimated Unix epoch (seconds) at a point in the race.
/// Returns a pace multiplier >= 1.0:
///   - 1.0 during daylight hours
///   - up to 1.15 around 3-4h UTC (peak sleep-deprivation window)
/// Model: smooth half-cosine bump centered at 3.5h UTC, +/-2h window.
/// Note: GPX timestamps are UTC, so the window is UTC-based.
/// Racers in UTC+2 experience the peak roughly at 5-6h local time.
pub fn circadianFactor(unix_time_s: i64) f64 {
    const hours_utc = @mod(@as(f64, @floatFromInt(unix_time_s)) / 3600.0, 24.0);
    const center: f64 = 3.5;
    const half_width: f64 = 2.0;
    const diff = hours_utc - center;
    if (@abs(diff) < half_width) {
        const t = diff / half_width; // normalised to [-1, 1]
        const bump = 0.5 * (1.0 + @cos(std.math.pi * t)); // cosine: 1 at centre, 0 at edges
        return 1.0 + 0.15 * bump;
    }
    return 1.0;
}

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

test "fatigueFactor: ultra finish ≈ 1.60 at 234km effort (Moderate preset)" {
    // exp(0.002 × 234) ≈ 1.60
    try std.testing.expectApproxEqAbs(1.60, fatigueFactor(234.0, K_FATIGUE), 0.01);
}

test "RECOVERY_LIFE_BASE: is between 0 and 1" {
    try std.testing.expect(RECOVERY_LIFE_BASE > 0.0);
    try std.testing.expect(RECOVERY_LIFE_BASE < 1.0);
}

test "circadianFactor: noon UTC returns 1.0 (no penalty)" {
    const noon_utc: i64 = 12 * 3600; // 12:00 UTC on day 0
    try std.testing.expectApproxEqAbs(1.0, circadianFactor(noon_utc), 1e-9);
}

test "circadianFactor: 3:30 UTC returns peak penalty (1.15)" {
    const peak_utc: i64 = 3 * 3600 + 30 * 60; // 03:30 UTC
    try std.testing.expectApproxEqAbs(1.15, circadianFactor(peak_utc), 1e-9);
}

test "circadianFactor: edges of window return 1.0" {
    // 1.5h and 5.5h UTC are exactly at the window boundary
    const edge_start: i64 = 1 * 3600 + 30 * 60; // 01:30 UTC
    const edge_end: i64 = 5 * 3600 + 30 * 60; // 05:30 UTC
    try std.testing.expectApproxEqAbs(1.0, circadianFactor(edge_start), 1e-6);
    try std.testing.expectApproxEqAbs(1.0, circadianFactor(edge_end), 1e-6);
}

test "circadianFactor: multiplier is always >= 1.0" {
    // Sweep over 24 hours in 10-minute steps
    var t: i64 = 0;
    while (t < 24 * 3600) : (t += 600) {
        try std.testing.expect(circadianFactor(t) >= 1.0);
    }
}

test "circadianFactor: wraps correctly across midnight (unix day boundary)" {
    // Day 2 at 3:30 UTC should give the same factor as day 0 at 3:30 UTC
    const t0: i64 = 3 * 3600 + 30 * 60;
    const t2: i64 = 2 * 24 * 3600 + 3 * 3600 + 30 * 60;
    try std.testing.expectApproxEqAbs(circadianFactor(t0), circadianFactor(t2), 1e-9);
}
