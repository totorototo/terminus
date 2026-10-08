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

/// One audio frame per point. Inputs of unequal length are cut to the shortest. The caller
/// owns the result.
pub fn generateAudioFrames(
    allocator: std.mem.Allocator,
    elevations_m: []const f64,
    distances_m: []const f64,
    slopes_percent: []const f64,
    bearings_degrees: []const f64,
    paces_s_per_m: []const f64,
) ![]gpxz.soundscape.AudioFrame {
    const count = @min(
        elevations_m.len,
        distances_m.len,
        slopes_percent.len,
        bearings_degrees.len,
        paces_s_per_m.len,
    );
    const inputs: gpxz.soundscape.Inputs = .{
        .elevations_m = elevations_m[0..count],
        .distances_m = distances_m[0..count],
        .slopes_percent = slopes_percent[0..count],
        .bearings_degrees = bearings_degrees[0..count],
        .paces_s_per_m = paces_s_per_m[0..count],
    };
    return gpxz.soundscape.audio_frames_generate(allocator, &inputs);
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

test "generateAudioFrames: cuts unequal inputs to the shortest" {
    const elevations = [_]f64{ 100, 200, 300 };
    const distances = [_]f64{ 0, 100, 200 };
    const slopes = [_]f64{ 0, 10, 10 };
    const bearings = [_]f64{ 0, 0 };
    const paces = [_]f64{ 0.5, 0.5, 0.5 };
    const frames = try generateAudioFrames(
        testing.allocator,
        &elevations,
        &distances,
        &slopes,
        &bearings,
        &paces,
    );
    defer testing.allocator.free(frames);
    try testing.expectEqual(@as(usize, 2), frames.len);

    const empty = try generateAudioFrames(testing.allocator, &.{}, &.{}, &.{}, &.{}, &.{});
    defer testing.allocator.free(empty);
    try testing.expectEqual(@as(usize, 0), empty.len);
}
