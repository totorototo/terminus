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

/// The model in a plan.json (from Regimen or `gpxz --plan`), once gpxz has read and validated
/// it and checked it was made for the route in `gpx_bytes`: `CourseMismatch` otherwise.
/// Only the model is taken: Terminus adds the live weather and recalibration on top, so its
/// ETAs are never the plan's times and there is nothing to compare them with.
pub fn readPlanModel(
    allocator: std.mem.Allocator,
    plan_bytes: []const u8,
    gpx_bytes: []const u8,
) !PlanModel {
    const parsed = try gpxz.plan_read(allocator, plan_bytes);
    defer parsed.deinit();
    if (!gpxz.plan.course_matches(&parsed.value, gpx_bytes)) return error.CourseMismatch;
    const model = parsed.value.model;
    // plan_read's validation, checked again where a bad model would reach gpxz's asserts.
    _ = try settings_make(
        model.pace_base_s_per_km,
        model.fatigue_coefficient,
        model.life_base_stop_s,
        .empty,
    );
    return model;
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
fn plan_json_test(settings: *const gpxz.Settings) ![]u8 {
    var data = try gpxz.parse(testing.allocator, route_gpx, settings);
    defer data.deinit(testing.allocator);
    const plan = gpxz.plan_build(
        route_gpx,
        data.metadata.name,
        data.trace.distance_m,
        data.plan.?,
        settings,
    );
    var out: std.Io.Writer.Allocating = .init(testing.allocator);
    errdefer out.deinit();
    try gpxz.plan_write(&out.writer, &plan);
    return out.toOwnedSlice();
}

test "readPlanModel: the model of a plan.json made for this route" {
    const settings: gpxz.Settings = .{
        .pace_base_s_per_km = 420,
        .fatigue_coefficient = 0.003,
        .life_base_stop_s = 1800,
    };
    const json = try plan_json_test(&settings);
    defer testing.allocator.free(json);
    const model = try readPlanModel(testing.allocator, json, route_gpx);
    try testing.expectEqual(@as(f64, 420), model.pace_base_s_per_km);
    try testing.expectEqual(@as(f64, 0.003), model.fatigue_coefficient);
    try testing.expectEqual(@as(u32, 1800), model.life_base_stop_s);
}

test "readPlanModel: another route, or a bad file, is an error" {
    const json = try plan_json_test(&.{});
    defer testing.allocator.free(json);
    const edited = route_gpx[0 .. route_gpx.len - 1];
    try testing.expectError(error.CourseMismatch, readPlanModel(testing.allocator, json, edited));
    try testing.expectError(error.SyntaxError, readPlanModel(testing.allocator, "nope", route_gpx));
    const v2 = "{\"schema_version\": 2}";
    try testing.expectError(
        error.SchemaVersionUnsupported,
        readPlanModel(testing.allocator, v2, route_gpx),
    );
}
