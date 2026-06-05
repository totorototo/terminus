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

/// Default planned stop time at a LifeBase in seconds.
/// Used when no per-waypoint <stopDuration> is set in the GPX and no UI override is provided.
pub const DEFAULT_LIFE_BASE_STOP_S: u32 = 3600; // 1 hour

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

// ──────────────────────────────────────────────────────────────────────────────
// Weather model
// ──────────────────────────────────────────────────────────────────────────────
//
// Weather acts as one more multiplicative pace penalty, alongside slope, fatigue
// and circadian factors. All sub-factors return >= 1.0: bad weather only slows a
// runner; the neutral baseline (cool, dry, calm) returns exactly 1.0.
//
// Inputs match the Open-Meteo fields already fetched on the JS side:
//   temperature_c   — air temperature (°C, temperature_2m)
//   humidity_pct    — relative humidity (%, 0–100) — amplifies heat stress
//   wind_kmh        — wind speed (km/h, windspeed_10m)
//   precip_prob_pct — precipitation probability (%, 0–100, precipitation_probability)

/// Forecast conditions sampled at a point/time along the route.
/// Flat struct of f64 so it is Zigar-marshalable from JS.
pub const WeatherConditions = struct {
    temperature_c: f64,
    humidity_pct: f64,
    wind_kmh: f64,
    precip_prob_pct: f64,
};

/// Neutral conditions — cool, dry, calm. weatherFactor(WEATHER_NEUTRAL) == 1.0.
/// Use this when no forecast is available so estimates are unchanged.
pub const WEATHER_NEUTRAL = WeatherConditions{
    .temperature_c = WEATHER_T_OPT,
    .humidity_pct = 50.0,
    .wind_kmh = 0.0,
    .precip_prob_pct = 0.0,
};

/// Optimal ambient temperature for endurance running (°C) — neutral pace here.
pub const WEATHER_T_OPT: f64 = 12.0;
/// Pace penalty per °C of *apparent* temperature above the optimum.
/// 0.006 ≈ +3% per +5 °C, in line with marathon-vs-WBGT performance studies.
pub const WEATHER_HEAT_PER_C: f64 = 0.006;
/// Below this temperature (°C) cold begins to add a (small) penalty.
pub const WEATHER_COLD_THRESHOLD_C: f64 = 0.0;
/// Pace penalty per °C below the cold threshold (stiffness, footing, clothing).
pub const WEATHER_COLD_PER_C: f64 = 0.003;
/// Wind speed (km/h) below which wind has negligible effect on pace.
pub const WEATHER_WIND_THRESHOLD_KMH: f64 = 15.0;
/// Pace penalty per km/h of wind above the threshold.
pub const WEATHER_WIND_PER_KMH: f64 = 0.004;
/// Cap on the wind penalty (fraction of pace).
pub const WEATHER_WIND_MAX: f64 = 0.20;
/// Pace penalty at 100% precipitation probability (wet, muddy, low-traction trail).
pub const WEATHER_PRECIP_MAX: f64 = 0.08;

/// Apparent (feels-like) temperature in °C.
/// Humidity only matters once it is warm: above ~20 °C, sweat evaporates less
/// readily so high relative humidity inflates the effective heat load. Below
/// 20 °C the air temperature is returned unchanged.
pub fn apparentTempC(temp_c: f64, humidity_pct: f64) f64 {
    if (temp_c <= 20.0) return temp_c;
    const rh = std.math.clamp(humidity_pct, 0.0, 100.0);
    const excess_rh = @max(0.0, rh - 40.0) / 10.0; // 10%-RH units above 40%
    return temp_c + excess_rh * (temp_c - 20.0) * 0.1;
}

/// Thermal pace multiplier (>= 1.0) from temperature and humidity.
///   - Apparent temp above WEATHER_T_OPT → heat penalty (humidity-amplified).
///   - Raw temp below WEATHER_COLD_THRESHOLD_C → cold penalty.
///   - In between → neutral (1.0).
pub fn thermalFactor(temp_c: f64, humidity_pct: f64) f64 {
    const at = apparentTempC(temp_c, humidity_pct);
    if (at > WEATHER_T_OPT) {
        return 1.0 + (at - WEATHER_T_OPT) * WEATHER_HEAT_PER_C;
    }
    if (temp_c < WEATHER_COLD_THRESHOLD_C) {
        return 1.0 + (WEATHER_COLD_THRESHOLD_C - temp_c) * WEATHER_COLD_PER_C;
    }
    return 1.0;
}

/// Wind pace multiplier (>= 1.0). Forecast wind is a scalar speed with unknown
/// bearing relative to the runner, so this models the averaged exposure cost on
/// an out-and-back/loop course rather than a pure headwind. Capped at WEATHER_WIND_MAX.
pub fn windFactor(wind_kmh: f64) f64 {
    if (wind_kmh <= WEATHER_WIND_THRESHOLD_KMH) return 1.0;
    const penalty = (wind_kmh - WEATHER_WIND_THRESHOLD_KMH) * WEATHER_WIND_PER_KMH;
    return 1.0 + @min(WEATHER_WIND_MAX, penalty);
}

/// Precipitation pace multiplier (>= 1.0). Uses precipitation *probability* as a
/// proxy for the likelihood of wet, muddy, low-traction ground along the segment.
pub fn precipFactor(precip_prob_pct: f64) f64 {
    const p = std.math.clamp(precip_prob_pct, 0.0, 100.0) / 100.0;
    return 1.0 + WEATHER_PRECIP_MAX * p;
}

/// Combined weather pace multiplier (>= 1.0): thermal × wind × precipitation.
/// Multiply base pace by this alongside paceFactor, fatigueFactor and circadianFactor.
pub fn weatherFactor(c: WeatherConditions) f64 {
    return thermalFactor(c.temperature_c, c.humidity_pct) *
        windFactor(c.wind_kmh) *
        precipFactor(c.precip_prob_pct);
}

/// Name-keyed weather forecast table.
///
/// Weather varies by *location and time*, but the forecast a runner will meet on
/// a section depends on their ETA there — which is itself an output of the pace
/// model. Keying by checkpoint name (a stable identifier) breaks that circular
/// dependency: the caller computes ETAs once with neutral weather, fetches a
/// forecast per checkpoint name, then recomputes with this lookup populated.
///
/// `names[i]` is the checkpoint name whose conditions are `values[i]`.
/// Unknown names resolve to WEATHER_NEUTRAL (factor 1.0), so partial coverage
/// only adjusts the sections that have a forecast.
pub const WeatherLookup = struct {
    names: []const []const u8,
    values: []const WeatherConditions,

    /// An empty lookup — every query returns neutral conditions.
    pub const empty = WeatherLookup{ .names = &.{}, .values = &.{} };

    /// Forecast conditions for `name`, or WEATHER_NEUTRAL when not present.
    pub fn find(self: WeatherLookup, name: []const u8) WeatherConditions {
        for (self.names, 0..) |n, i| {
            if (i >= self.values.len) break;
            if (std.mem.eql(u8, n, name)) return self.values[i];
        }
        return WEATHER_NEUTRAL;
    }

    /// Weather pace multiplier (>= 1.0) for `name`; 1.0 when not present.
    pub fn factorFor(self: WeatherLookup, name: []const u8) f64 {
        return weatherFactor(self.find(name));
    }
};

/// Default flat-terrain pace used when no user pace is provided.
/// 500 s/km = 8:20/km — matches the "Moderate" UI preset.
pub const DEFAULT_BASE_PACE_S_PER_KM: f64 = 500.0;

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

test "apparentTempC: humidity has no effect when cool" {
    // At or below 20 °C the raw temperature is returned unchanged.
    try std.testing.expectApproxEqAbs(10.0, apparentTempC(10.0, 90.0), 1e-9);
    try std.testing.expectApproxEqAbs(20.0, apparentTempC(20.0, 100.0), 1e-9);
}

test "apparentTempC: high humidity inflates warm temperatures" {
    // 30 °C at 90% RH should feel hotter than the dry air temperature.
    try std.testing.expect(apparentTempC(30.0, 90.0) > 30.0);
    // 30 °C at 40% RH (threshold) adds nothing.
    try std.testing.expectApproxEqAbs(30.0, apparentTempC(30.0, 40.0), 1e-9);
}

test "thermalFactor: optimal temperature is neutral" {
    try std.testing.expectApproxEqAbs(1.0, thermalFactor(WEATHER_T_OPT, 50.0), 1e-9);
}

test "thermalFactor: heat slows pace and humidity makes it worse" {
    const dry = thermalFactor(30.0, 40.0);
    const humid = thermalFactor(30.0, 90.0);
    try std.testing.expect(dry > 1.0);
    try std.testing.expect(humid > dry);
}

test "thermalFactor: cold adds a small penalty" {
    // -10 °C → 1 + 10 × 0.003 = 1.03
    try std.testing.expectApproxEqAbs(1.03, thermalFactor(-10.0, 50.0), 1e-9);
}

test "thermalFactor: between cold threshold and optimum is neutral" {
    try std.testing.expectApproxEqAbs(1.0, thermalFactor(5.0, 50.0), 1e-9);
}

test "windFactor: calm and light wind are neutral" {
    try std.testing.expectApproxEqAbs(1.0, windFactor(0.0), 1e-9);
    try std.testing.expectApproxEqAbs(1.0, windFactor(WEATHER_WIND_THRESHOLD_KMH), 1e-9);
}

test "windFactor: strong wind penalises pace" {
    // 40 km/h → 1 + (40-15) × 0.004 = 1.10
    try std.testing.expectApproxEqAbs(1.10, windFactor(40.0), 1e-9);
}

test "windFactor: penalty is capped" {
    // Gale-force values clamp at WEATHER_WIND_MAX.
    try std.testing.expectApproxEqAbs(1.0 + WEATHER_WIND_MAX, windFactor(1000.0), 1e-9);
}

test "precipFactor: dry is neutral, certain rain is max penalty" {
    try std.testing.expectApproxEqAbs(1.0, precipFactor(0.0), 1e-9);
    try std.testing.expectApproxEqAbs(1.0 + WEATHER_PRECIP_MAX, precipFactor(100.0), 1e-9);
}

test "precipFactor: clamps out-of-range probabilities" {
    try std.testing.expectApproxEqAbs(1.0, precipFactor(-20.0), 1e-9);
    try std.testing.expectApproxEqAbs(1.0 + WEATHER_PRECIP_MAX, precipFactor(150.0), 1e-9);
}

test "weatherFactor: neutral conditions return exactly 1.0" {
    try std.testing.expectApproxEqAbs(1.0, weatherFactor(WEATHER_NEUTRAL), 1e-9);
}

test "weatherFactor: combines all sub-factors multiplicatively" {
    const c = WeatherConditions{
        .temperature_c = 30.0,
        .humidity_pct = 90.0,
        .wind_kmh = 40.0,
        .precip_prob_pct = 100.0,
    };
    const expected = thermalFactor(30.0, 90.0) * windFactor(40.0) * precipFactor(100.0);
    try std.testing.expectApproxEqAbs(expected, weatherFactor(c), 1e-12);
}

test "weatherFactor: is always >= 1.0 across a broad sweep" {
    var temp: f64 = -20.0;
    while (temp <= 45.0) : (temp += 5.0) {
        var rh: f64 = 0.0;
        while (rh <= 100.0) : (rh += 25.0) {
            var wind: f64 = 0.0;
            while (wind <= 60.0) : (wind += 20.0) {
                var precip: f64 = 0.0;
                while (precip <= 100.0) : (precip += 50.0) {
                    const c = WeatherConditions{
                        .temperature_c = temp,
                        .humidity_pct = rh,
                        .wind_kmh = wind,
                        .precip_prob_pct = precip,
                    };
                    try std.testing.expect(weatherFactor(c) >= 1.0);
                }
            }
        }
    }
}

test "WeatherLookup.empty: every query is neutral" {
    try std.testing.expectApproxEqAbs(1.0, WeatherLookup.empty.factorFor("anything"), 1e-9);
    const c = WeatherLookup.empty.find("anything");
    try std.testing.expectApproxEqAbs(1.0, weatherFactor(c), 1e-9);
}

test "WeatherLookup.find: returns matching conditions by name" {
    const names = [_][]const u8{ "Courmayeur", "Champex" };
    const values = [_]WeatherConditions{
        .{ .temperature_c = 30.0, .humidity_pct = 90.0, .wind_kmh = 40.0, .precip_prob_pct = 100.0 },
        WEATHER_NEUTRAL,
    };
    const lookup = WeatherLookup{ .names = &names, .values = &values };

    const hot = lookup.find("Courmayeur");
    try std.testing.expectApproxEqAbs(30.0, hot.temperature_c, 1e-9);
    try std.testing.expect(lookup.factorFor("Courmayeur") > 1.0);
    // Known-but-neutral checkpoint resolves to factor 1.0.
    try std.testing.expectApproxEqAbs(1.0, lookup.factorFor("Champex"), 1e-9);
}

test "WeatherLookup.find: unknown name resolves to neutral" {
    const names = [_][]const u8{"Courmayeur"};
    const values = [_]WeatherConditions{
        .{ .temperature_c = 30.0, .humidity_pct = 90.0, .wind_kmh = 40.0, .precip_prob_pct = 100.0 },
    };
    const lookup = WeatherLookup{ .names = &names, .values = &values };
    try std.testing.expectApproxEqAbs(1.0, lookup.factorFor("Unknown"), 1e-9);
}

test "WeatherLookup.find: tolerates names longer than values" {
    // Defensive: mismatched parallel-array lengths must not read out of bounds.
    const names = [_][]const u8{ "A", "B", "C" };
    const values = [_]WeatherConditions{WEATHER_NEUTRAL};
    const lookup = WeatherLookup{ .names = &names, .values = &values };
    try std.testing.expectApproxEqAbs(1.0, lookup.factorFor("A"), 1e-9);
    try std.testing.expectApproxEqAbs(1.0, lookup.factorFor("C"), 1e-9);
}
