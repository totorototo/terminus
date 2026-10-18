//! terminus: the WebAssembly boundary. Zigar exposes these declarations to the GPX worker
//! (src/gpxWorker.js); all the work lives in gpxz.
//!
//! Unlike retrace, which returns JSON, terminus hands gpxz's structs to JavaScript as they
//! are: the worker reads the point arrays as zero-copy Float64Array views (`points_flat`,
//! `points_full_resolution`), which JSON would turn into strings of several MiB. The worker
//! renames gpxz's snake_case fields to the store's camelCase as it copies them out.
//!
//! gpxz asserts its preconditions, and an assert is undefined behavior in ReleaseSmall, so
//! everything JavaScript passes in is checked here first.

const std = @import("std");
const testing = std.testing;
const gpxz = @import("gpxz");

pub const Trace = gpxz.Trace;
pub const Route = gpxz.gpx.Route;
pub const WeatherLookup = gpxz.WeatherLookup;

pub const InputError = error{ SettingsInvalid, ElapsedInvalid };

/// A plan.json's model: what Terminus runs the pace model with when the runner loads one.
pub const PlanModel = gpxz.plan.Model;
pub const Supply = gpxz.fueling.Supply;
pub const Carry = gpxz.fueling.Carry;
pub const Times = gpxz.fueling.Times;

/// What Terminus takes from a plan.json: the model it runs, and the plan's fueling as the plan
/// has it. The carry is the plan's, at the plan's times: it isn't re-sized to live ETAs.
/// Owns `model.fueling.supplies`, `carry` and `times`; the worker frees them with `deinit`.
pub const PlanRead = struct {
    model: PlanModel,
    /// One per plan entry with fueling, else null rather than empty: a zero-length slice from
    /// an allocator has a placeholder address, which Zigar can't view in WASM memory.
    carry: ?[]const ?Carry,
    /// The plan's arrival and departure at each entry, with fueling only (null alike): the
    /// times the carry was sized for, so the fueling view reads the plan's legs, not live ETAs.
    times: ?[]const Times,

    pub fn deinit(self: *PlanRead, allocator: std.mem.Allocator) void {
        if (self.model.fueling) |fueling| allocator.free(fueling.supplies);
        if (self.carry) |carry| allocator.free(carry);
        if (self.times) |times| allocator.free(times);
        self.* = undefined;
    }
};

// ── Exports (camelCase: these names are the JavaScript API) ──────────────────────────────

/// Parses a GPX file and computes everything the UI shows. The caller frees the result with
/// `deinit`.
pub fn readGPXComplete(
    allocator: std.mem.Allocator,
    bytes: []const u8,
    pace_base_s_per_km: f64,
    fatigue_coefficient: f64,
    life_base_stop_s: u32,
    weather: WeatherLookup,
) !gpxz.GPXData {
    const settings = try settings_make(pace_base_s_per_km, fatigue_coefficient, life_base_stop_s, weather);
    return gpxz.parse(allocator, bytes, &settings);
}

/// Recalibrates section and stage ETAs on a resident Route. An index past the end of the
/// trace counts as the whole route covered. The caller frees the result with `deinit`.
pub fn recalibrate(
    allocator: std.mem.Allocator,
    route: *const Route,
    index_current: usize,
    elapsed_s_actual: f64,
    pace_base_s_per_km: f64,
    fatigue_coefficient: f64,
    life_base_stop_s: u32,
    weather: WeatherLookup,
) !gpxz.gpx.RecalibrationPair {
    const settings = try settings_make(pace_base_s_per_km, fatigue_coefficient, life_base_stop_s, weather);
    if (!std.math.isFinite(elapsed_s_actual) or elapsed_s_actual < 0) return error.ElapsedInvalid;
    const points_count = route.trace.points.len;
    const index = if (points_count == 0) 0 else @min(index_current, points_count - 1);
    return route.recalibrate(allocator, index, elapsed_s_actual, &settings);
}

/// The model and fueling in a plan.json (from Regimen or `gpxz --plan`), once gpxz has read
/// and validated it and checked it was made for the route in `gpx_bytes`: `CourseMismatch`
/// otherwise. Only the entries' times are kept, for the fueling: Terminus adds the live weather
/// and recalibration on top, so its ETAs are never the plan's times. The caller frees the
/// result with `deinit`.
pub fn readPlan(
    allocator: std.mem.Allocator,
    plan_bytes: []const u8,
    gpx_bytes: []const u8,
) !PlanRead {
    const parsed = try gpxz.plan_read(allocator, plan_bytes);
    defer parsed.deinit();
    if (!gpxz.plan.course_matches(&parsed.value, gpx_bytes)) return error.CourseMismatch;
    var model = parsed.value.model;
    // plan_read's validation, checked again where a bad model would reach gpxz's asserts.
    _ = try settings_make(
        model.pace_base_s_per_km,
        model.fatigue_coefficient,
        model.life_base_stop_s,
        .empty,
    );
    // No fueling: nothing to copy, and plan_valid guarantees no carry either.
    if (model.fueling == null) {
        std.debug.assert(parsed.value.carry.len == 0);
        return .{ .model = model, .carry = null, .times = null };
    }
    // The supplies and the carry point into `parsed`, which is freed on return: copy them.
    // gpxz checked one of each per entry, so neither is empty unless the plan has no entries.
    const fueling = &model.fueling.?;
    fueling.supplies = try allocator.dupe(Supply, fueling.supplies);
    errdefer allocator.free(fueling.supplies);
    const carry = try allocator.dupe(?Carry, parsed.value.carry);
    errdefer allocator.free(carry);
    std.debug.assert(carry.len == fueling.supplies.len);
    // plan_valid checked the entries run forward, which times_from_entries asserts.
    const times = try allocator.alloc(Times, parsed.value.entries.len);
    gpxz.fueling.times_from_entries(parsed.value.entries, times);
    std.debug.assert(times.len == carry.len);
    return .{ .model = model, .carry = carry, .times = times };
}

// ── Implementation ───────────────────────────────────────────────────────────────────────

fn settings_make(
    pace_base_s_per_km: f64,
    fatigue_coefficient: f64,
    life_base_stop_s: u32,
    weather: WeatherLookup,
) InputError!gpxz.Settings {
    if (!std.math.isFinite(pace_base_s_per_km) or pace_base_s_per_km <= 0) {
        return error.SettingsInvalid;
    }
    if (!std.math.isFinite(fatigue_coefficient) or fatigue_coefficient < 0) {
        return error.SettingsInvalid;
    }
    if (weather.names.len != weather.values.len) return error.SettingsInvalid;
    return .{
        .pace_base_s_per_km = pace_base_s_per_km,
        .fatigue_coefficient = fatigue_coefficient,
        .life_base_stop_s = life_base_stop_s,
        .weather = weather,
    };
}

// ── Tests ────────────────────────────────────────────────────────────────────────────────

const route_gpx =
    \\<?xml version="1.0" encoding="UTF-8"?>
    \\<gpx version="1.1">
    \\ <metadata><name>Boundary test</name></metadata>
    \\ <wpt lat="45.000" lon="7.000"><name>Start</name><type>Start</type>
    \\  <time>2026-06-01T06:00:00Z</time></wpt>
    \\ <wpt lat="45.010" lon="7.010"><name>CP1</name><type>TimeBarrier</type>
    \\  <time>2026-06-01T09:00:00Z</time></wpt>
    \\ <wpt lat="45.020" lon="7.020"><name>Finish</name><type>Arrival</type>
    \\  <time>2026-06-01T12:00:00Z</time></wpt>
    \\ <trk><trkseg>
    \\  <trkpt lat="45.000" lon="7.000"><ele>300</ele></trkpt>
    \\  <trkpt lat="45.005" lon="7.005"><ele>450</ele></trkpt>
    \\  <trkpt lat="45.010" lon="7.010"><ele>600</ele></trkpt>
    \\  <trkpt lat="45.015" lon="7.015"><ele>450</ele></trkpt>
    \\  <trkpt lat="45.020" lon="7.020"><ele>300</ele></trkpt>
    \\ </trkseg></trk>
    \\</gpx>
;

test "readGPXComplete: parses through gpxz with the given settings" {
    var data = try readGPXComplete(testing.allocator, route_gpx, 500, 0.002, 3600, .empty);
    defer data.deinit(testing.allocator);
    try testing.expectEqualStrings("Boundary test", data.metadata.name.?);
    try testing.expectEqual(@as(usize, 3), data.waypoints.len);
    try testing.expectEqual(@as(usize, 2), data.sections.?.len);
    try testing.expectEqual(@as(usize, 5 * 3), data.points_full_resolution.len);
    try testing.expect(data.trace.distance_m > 0);
}

test "readGPXComplete: rejects invalid settings instead of asserting" {
    const invalid = [_][2]f64{
        .{ 0, 0.002 },
        .{ -1, 0.002 },
        .{ std.math.nan(f64), 0.002 },
        .{ 500, -0.1 },
        .{ 500, std.math.inf(f64) },
    };
    for (invalid) |case| {
        try testing.expectError(
            error.SettingsInvalid,
            readGPXComplete(testing.allocator, route_gpx, case[0], case[1], 3600, .empty),
        );
    }
    const mismatched: WeatherLookup = .{ .names = &.{"CP1"}, .values = &.{} };
    try testing.expectError(
        error.SettingsInvalid,
        readGPXComplete(testing.allocator, route_gpx, 500, 0.002, 3600, mismatched),
    );
}

test "recalibrate: clamps an index past the end and rejects a bad elapsed time" {
    var route = try Route.init(testing.allocator, route_gpx);
    defer route.deinit(testing.allocator);

    var pair = try recalibrate(testing.allocator, &route, 1_000_000, 7200, 500, 0.002, 3600, .empty);
    defer pair.deinit(testing.allocator);
    try testing.expect(pair.section != null);
    // Every interval is behind the runner, so nothing remains.
    for (pair.section.?.etas) |eta| try testing.expectEqual(@as(f64, 0), eta.duration_s_remaining);

    try testing.expectError(
        error.ElapsedInvalid,
        recalibrate(testing.allocator, &route, 0, -1, 500, 0.002, 3600, .empty),
    );
    try testing.expectError(
        error.ElapsedInvalid,
        recalibrate(testing.allocator, &route, 0, std.math.nan(f64), 500, 0.002, 3600, .empty),
    );
}

/// plan.json for `route_gpx` with `settings`, as gpxz writes it (Regimen's file).
fn plan_json_test(settings: *const gpxz.Settings, fuel_plan: ?*const gpxz.fueling.FuelPlan) ![]u8 {
    var data = try gpxz.parse(testing.allocator, route_gpx, settings);
    defer data.deinit(testing.allocator);
    const plan = gpxz.plan_build(
        route_gpx,
        data.metadata.name,
        data.trace.distance_m,
        data.plan.?,
        settings,
        fuel_plan,
    );
    var out: std.Io.Writer.Allocating = .init(testing.allocator);
    errdefer out.deinit();
    try gpxz.plan_write(&out.writer, &plan);
    return out.toOwnedSlice();
}

test "readPlan: the model of a plan.json made for this route" {
    const settings: gpxz.Settings = .{
        .pace_base_s_per_km = 420,
        .fatigue_coefficient = 0.003,
        .life_base_stop_s = 1800,
    };
    const json = try plan_json_test(&settings, null);
    defer testing.allocator.free(json);
    var plan = try readPlan(testing.allocator, json, route_gpx);
    defer plan.deinit(testing.allocator);
    try testing.expectEqual(@as(f64, 420), plan.model.pace_base_s_per_km);
    try testing.expectEqual(@as(f64, 0.003), plan.model.fatigue_coefficient);
    try testing.expectEqual(@as(u32, 1800), plan.model.life_base_stop_s);
    try testing.expect(plan.model.fueling == null);
    try testing.expect(plan.carry == null);
    try testing.expect(plan.times == null);
}

test "readPlan: the fueling and carry outlive the parsed plan" {
    var data = try gpxz.parse(testing.allocator, route_gpx, &.{});
    defer data.deinit(testing.allocator);
    const entries = data.plan.?;
    try testing.expectEqual(@as(usize, 3), entries.len);
    // The route has two sections, and the plan one entry more: its start.
    try testing.expectEqual(data.sections.?.len + 1, entries.len);
    const supplies = [_]Supply{ .full, .water, .none };
    const fueling: gpxz.fueling.Fueling = .{
        .carbs_g_per_h = 60,
        .fluid_ml_per_h = 500,
        .sodium_mg_per_h = 300,
        .reserve_s = 600,
        .supplies = &supplies,
    };
    var times: [3]gpxz.fueling.Times = undefined;
    gpxz.fueling.times_from_entries(entries, &times);
    var carry: [3]?Carry = undefined;
    gpxz.fueling.carry_compute(&times, &fueling, &carry);
    const fuel_plan: gpxz.fueling.FuelPlan = .{ .fueling = fueling, .carry = &carry };
    const json = try plan_json_test(&.{}, &fuel_plan);
    defer testing.allocator.free(json);

    var plan = try readPlan(testing.allocator, json, route_gpx);
    defer plan.deinit(testing.allocator);
    // std.testing.allocator would report a use-after-free if these pointed into the parse.
    try testing.expectEqualSlices(Supply, &supplies, plan.model.fueling.?.supplies);
    const read = plan.carry.?;
    try testing.expectEqual(@as(usize, 3), read.len);
    try testing.expectEqual(carry[0].?.carbs_g, read[0].?.carbs_g);
    try testing.expectEqual(carry[1].?.fluid_ml, read[1].?.fluid_ml);
    try testing.expect(read[1].?.carbs_g == null);
    try testing.expect(read[2] == null);
    try testing.expectEqualSlices(Times, &times, plan.times.?);
}

test "readPlan: another route, or a bad file, is an error" {
    const json = try plan_json_test(&.{}, null);
    defer testing.allocator.free(json);
    const edited = route_gpx[0 .. route_gpx.len - 1];
    try testing.expectError(error.CourseMismatch, readPlan(testing.allocator, json, edited));
    try testing.expectError(error.SyntaxError, readPlan(testing.allocator, "nope", route_gpx));
    const v3 = "{\"schema_version\": 3}";
    try testing.expectError(
        error.SchemaVersionUnsupported,
        readPlan(testing.allocator, v3, route_gpx),
    );
}
