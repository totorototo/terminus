const std = @import("std");
const testing = std.testing;
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const GPXData = @import("gpxdata.zig").GPXData;
const Metadata = @import("gpxdata.zig").Metadata;
const leg_mod = @import("leg.zig");
const LegStats = leg_mod.LegStats;
const section_mod = @import("section.zig");
const SectionStats = section_mod.SectionStats;
const stage_mod = @import("stage.zig");
const StageStats = stage_mod.StageStats;
const parseIso8601ToEpoch = @import("time.zig").parseIso8601ToEpoch;

pub fn readTracePoints(allocator: std.mem.Allocator, bytes: []const u8) ![][3]f64 {
    var points = std.ArrayList([3]f64){};
    defer points.deinit(allocator);

    var pos: usize = 0;
    trkpt_loop: while (std.mem.indexOfPos(u8, bytes, pos, "<trkpt")) |trkpt_start| {
        const trkpt_end = std.mem.indexOfPos(u8, bytes, trkpt_start, "</trkpt>") orelse break;
        pos = trkpt_end + 8;

        const tag_end = std.mem.indexOfPos(u8, bytes, trkpt_start, ">") orelse continue :trkpt_loop;
        const tag_section = bytes[trkpt_start..tag_end];
        const content_start = tag_end + 1;
        const content = bytes[content_start..trkpt_end];

        const lat_pos = std.mem.indexOf(u8, tag_section, "lat=\"") orelse continue :trkpt_loop;
        const lat_start = trkpt_start + lat_pos + 5;
        const lat_end = std.mem.indexOfScalarPos(u8, bytes, lat_start, '"') orelse continue :trkpt_loop;
        const lat = std.fmt.parseFloat(f64, bytes[lat_start..lat_end]) catch continue :trkpt_loop;

        const lon_pos = std.mem.indexOf(u8, tag_section, "lon=\"") orelse continue :trkpt_loop;
        const lon_start = trkpt_start + lon_pos + 5;
        const lon_end = std.mem.indexOfScalarPos(u8, bytes, lon_start, '"') orelse continue :trkpt_loop;
        const lon = std.fmt.parseFloat(f64, bytes[lon_start..lon_end]) catch continue :trkpt_loop;

        const ele_str = parseTagContent(bytes, content, content_start, trkpt_end, "<ele>", "</ele>") orelse continue :trkpt_loop;
        const ele = std.fmt.parseFloat(f64, ele_str) catch continue :trkpt_loop;

        try points.append(allocator, .{ lat, lon, ele });
    }

    return try points.toOwnedSlice(allocator);
}

/// Returns a slice into bytes for the content between open_tag and close_tag,
/// bounded to the waypoint element ending at wpt_end. No allocation.
fn parseTagContent(
    bytes: []const u8,
    content: []const u8,
    content_start: usize,
    wpt_end: usize,
    comptime open_tag: []const u8,
    comptime close_tag: []const u8,
) ?[]const u8 {
    const rel_pos = std.mem.indexOf(u8, content, open_tag) orelse return null;
    const value_start = content_start + rel_pos + open_tag.len;
    const value_end = std.mem.indexOfPos(u8, bytes, value_start, close_tag) orelse return null;
    if (value_end > wpt_end) return null;
    return bytes[value_start..value_end];
}

pub fn readWaypoints(allocator: std.mem.Allocator, bytes: []const u8) ![]Waypoint {
    var waypoints = std.ArrayList(Waypoint){};
    errdefer {
        for (waypoints.items) |*wpt| wpt.deinit(allocator);
        waypoints.deinit(allocator);
    }

    var pos: usize = 0;
    wpt_loop: while (std.mem.indexOfPos(u8, bytes, pos, "<wpt")) |wpt_start| {
        // Find end of waypoint element first to bound all searches
        const wpt_end = std.mem.indexOfPos(u8, bytes, wpt_start, "</wpt>") orelse break;
        // Advance pos now so any `continue :wpt_loop` always moves forward
        pos = wpt_end + 6;

        // Find end of opening tag; skip malformed waypoint if missing
        const tag_end = std.mem.indexOfPos(u8, bytes[wpt_start..wpt_end], 0, ">") orelse continue :wpt_loop;
        const tag_section = bytes[wpt_start .. wpt_start + tag_end];
        const content_start = wpt_start + tag_end + 1;
        const content = bytes[content_start..wpt_end];

        // lat and lon are required; skip the waypoint if missing or malformed
        const lat_pos = std.mem.indexOf(u8, tag_section, "lat=\"") orelse continue :wpt_loop;
        const lat_start = wpt_start + lat_pos + 5;
        const lat_end = std.mem.indexOfScalarPos(u8, bytes, lat_start, '"') orelse continue :wpt_loop;
        const lat = std.fmt.parseFloat(f64, bytes[lat_start..lat_end]) catch continue :wpt_loop;

        const lon_pos = std.mem.indexOf(u8, tag_section, "lon=\"") orelse continue :wpt_loop;
        const lon_start = wpt_start + lon_pos + 5;
        const lon_end = std.mem.indexOfScalarPos(u8, bytes, lon_start, '"') orelse continue :wpt_loop;
        const lon = std.fmt.parseFloat(f64, bytes[lon_start..lon_end]) catch continue :wpt_loop;

        const ele: ?f64 = if (parseTagContent(bytes, content, content_start, wpt_end, "<ele>", "</ele>")) |s|
            std.fmt.parseFloat(f64, s) catch null
        else
            null;

        // name is always allocated so Waypoint.deinit can unconditionally free it
        const name = try allocator.dupe(u8, parseTagContent(bytes, content, content_start, wpt_end, "<name>", "</name>") orelse "");
        errdefer allocator.free(name);

        const desc = if (parseTagContent(bytes, content, content_start, wpt_end, "<desc>", "</desc>")) |s|
            allocator.dupe(u8, s) catch null
        else
            null;
        errdefer if (desc) |d| allocator.free(d);

        const cmt = if (parseTagContent(bytes, content, content_start, wpt_end, "<cmt>", "</cmt>")) |s|
            allocator.dupe(u8, s) catch null
        else
            null;
        errdefer if (cmt) |c| allocator.free(c);

        const sym = if (parseTagContent(bytes, content, content_start, wpt_end, "<sym>", "</sym>")) |s|
            allocator.dupe(u8, s) catch null
        else
            null;
        errdefer if (sym) |s2| allocator.free(s2);

        // "Start", "TimeBarrier", "LifeBase", "Arrival" mark stage/section boundaries
        const wpt_type = if (parseTagContent(bytes, content, content_start, wpt_end, "<type>", "</type>")) |s|
            allocator.dupe(u8, s) catch null
        else
            null;
        errdefer if (wpt_type) |t| allocator.free(t);

        const time_epoch: ?i64 = if (parseTagContent(bytes, content, content_start, wpt_end, "<time>", "</time>")) |s|
            parseIso8601ToEpoch(s) catch null
        else
            null;

        try waypoints.append(allocator, Waypoint{
            .lat = lat,
            .lon = lon,
            .ele = ele,
            .name = name,
            .desc = desc,
            .cmt = cmt,
            .sym = sym,
            .wptType = wpt_type,
            .time = time_epoch,
        });
    }

    return try waypoints.toOwnedSlice(allocator);
}

pub fn readMetadata(allocator: std.mem.Allocator, bytes: []const u8) !Metadata {
    var metadata = Metadata{
        .name = null,
        .description = null,
    };
    errdefer metadata.deinit(allocator);

    // Find the <metadata> section (optional in GPX)
    if (std.mem.indexOf(u8, bytes, "<metadata>")) |metadata_start| {
        const metadata_end = std.mem.indexOfPos(u8, bytes, metadata_start, "</metadata>") orelse return metadata;
        const metadata_content = bytes[metadata_start..metadata_end];

        // Parse name
        if (std.mem.indexOf(u8, metadata_content, "<name>")) |name_pos| {
            const value_start = metadata_start + name_pos + 6;
            if (std.mem.indexOfPos(u8, bytes, value_start, "</name>")) |value_end| {
                if (value_end <= metadata_end) {
                    const name_str = bytes[value_start..value_end];
                    metadata.name = try allocator.dupe(u8, name_str);
                }
            }
        }

        // Parse description
        if (std.mem.indexOf(u8, metadata_content, "<desc>")) |desc_pos| {
            const value_start = metadata_start + desc_pos + 6;
            if (std.mem.indexOfPos(u8, bytes, value_start, "</desc>")) |value_end| {
                if (value_end <= metadata_end) {
                    const desc_str = bytes[value_start..value_end];
                    metadata.description = try allocator.dupe(u8, desc_str);
                }
            }
        }
    } else {
        // If no metadata section, try to find name and description at root level
        // Some GPX files have <name> directly under <gpx>
        if (std.mem.indexOf(u8, bytes, "<name>")) |name_pos| {
            const value_start = name_pos + 6;
            if (std.mem.indexOfPos(u8, bytes, value_start, "</name>")) |value_end| {
                const name_str = bytes[value_start..value_end];
                metadata.name = try allocator.dupe(u8, name_str);
            }
        }

        if (std.mem.indexOf(u8, bytes, "<desc>")) |desc_pos| {
            const value_start = desc_pos + 6;
            if (std.mem.indexOfPos(u8, bytes, value_start, "</desc>")) |value_end| {
                const desc_str = bytes[value_start..value_end];
                metadata.description = try allocator.dupe(u8, desc_str);
            }
        }
    }

    return metadata;
}

pub fn readGPXComplete(allocator: std.mem.Allocator, bytes: []const u8) !GPXData {
    var metadata = try readMetadata(allocator, bytes);
    errdefer metadata.deinit(allocator);

    const trace_points = try readTracePoints(allocator, bytes);

    const waypoints = try readWaypoints(allocator, bytes);
    errdefer {
        for (waypoints) |*wpt| {
            wpt.deinit(allocator);
        }
        allocator.free(waypoints);
    }

    var trace = try Trace.init(allocator, trace_points);
    defer allocator.free(trace_points); // Trace owns its own copy
    errdefer trace.deinit(allocator);

    // Legs: computed between every consecutive pair of waypoints
    var legs: ?[]const LegStats = null;
    if (waypoints.len > 1) {
        legs = try leg_mod.computeFromWaypoints(&trace, allocator, waypoints);
    }
    errdefer if (legs) |l| allocator.free(l);

    // Sections: computed between consecutive section-boundary waypoints (Start/TimeBarrier/LifeBase/Arrival)
    const sections: ?[]const SectionStats = try section_mod.computeFromWaypoints(&trace, allocator, waypoints);
    errdefer if (sections) |s| allocator.free(s);

    // Stages: computed between consecutive stage-boundary waypoints (Start/LifeBase/Arrival)
    const stages: ?[]const StageStats = try stage_mod.computeFromWaypoints(&trace, allocator, waypoints);
    errdefer if (stages) |st| allocator.free(st);

    return GPXData{
        .trace = trace,
        .waypoints = waypoints,
        .legs = legs,
        .sections = sections,
        .stages = stages,
        .metadata = metadata,
    };
}

// Tests

test "readGPXComplete creates valid trace" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
        \\<gpx version="1.1" creator="ZigGPXGenerator" xmlns="http://www.topografix.com/GPX/1/1">
        \\ <trk>
        \\ <name>Sample Track</name>
        \\ <trkseg>
        \\ <trkpt lat="37.123456" lon="-122.123456"><ele>100.0</ele></trkpt>
        \\ <trkpt lat="37.123556" lon="-122.123556"><ele>150.0</ele></trkpt>
        \\ <trkpt lat="37.123656" lon="-122.123656"><ele>200.0</ele></trkpt>
        \\ </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    var gpx_data = try readGPXComplete(allocator, sample_gpx);
    defer gpx_data.deinit(allocator);

    try testing.expectEqual(@as(usize, 3), gpx_data.trace.points.len);
    try testing.expectEqual(37.123456, gpx_data.trace.points[0][0]);
    try testing.expectEqual(-122.123456, gpx_data.trace.points[0][1]);
    try testing.expectEqual(100.0, gpx_data.trace.points[0][2]);

    try testing.expectEqual(37.123556, gpx_data.trace.points[1][0]);
    try testing.expectEqual(-122.123556, gpx_data.trace.points[1][1]);
    try testing.expectEqual(150.0, gpx_data.trace.points[1][2]);
}

test "readMetadata extracts name and description" {
    const allocator = testing.allocator;

    const gpx_with_metadata =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1" creator="Test">
        \\ <metadata>
        \\  <name>My Trail Run</name>
        \\  <desc>A beautiful mountain trail with amazing views</desc>
        \\ </metadata>
        \\ <trk><trkseg></trkseg></trk>
        \\</gpx>
    ;

    var metadata = try readMetadata(allocator, gpx_with_metadata);
    defer metadata.deinit(allocator);

    try testing.expect(metadata.name != null);
    try testing.expectEqualStrings("My Trail Run", metadata.name.?);

    try testing.expect(metadata.description != null);
    try testing.expectEqualStrings("A beautiful mountain trail with amazing views", metadata.description.?);
}

test "readMetadata handles missing metadata" {
    const allocator = testing.allocator;

    const gpx_no_metadata =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1" creator="Test">
        \\ <trk><trkseg></trkseg></trk>
        \\</gpx>
    ;

    var metadata = try readMetadata(allocator, gpx_no_metadata);
    defer metadata.deinit(allocator);

    try testing.expect(metadata.name == null);
    try testing.expect(metadata.description == null);
}

test "readMetadata handles root level name" {
    const allocator = testing.allocator;

    const gpx_root_name =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1" creator="Test">
        \\ <name>Root Level Name</name>
        \\ <trk><trkseg></trkseg></trk>
        \\</gpx>
    ;

    var metadata = try readMetadata(allocator, gpx_root_name);
    defer metadata.deinit(allocator);

    try testing.expect(metadata.name != null);
    try testing.expectEqualStrings("Root Level Name", metadata.name.?);
}

test "readTracePoints extracts track points" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
        \\<gpx version="1.1" creator="ZigGPXGenerator" xmlns="http://www.topografix.com/GPX/1/1">
        \\ <trk>
        \\ <name>Sample Track</name>
        \\ <trkseg>
        \\ <trkpt lat="37.123456" lon="-122.123456"><ele>100.0</ele></trkpt>
        \\ <trkpt lat="37.123556" lon="-122.123556"><ele>150.0</ele></trkpt>
        \\ <trkpt lat="37.123656" lon="-122.123656"><ele>200.0</ele></trkpt>
        \\ </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, sample_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 3), points.len);
    try testing.expectEqual(37.123456, points[0][0]);
    try testing.expectEqual(-122.123456, points[0][1]);
    try testing.expectEqual(100.0, points[0][2]);

    try testing.expectEqual(37.123556, points[1][0]);
    try testing.expectEqual(-122.123556, points[1][1]);
    try testing.expectEqual(150.0, points[1][2]);

    try testing.expectEqual(37.123656, points[2][0]);
    try testing.expectEqual(-122.123656, points[2][1]);
    try testing.expectEqual(200.0, points[2][2]);
}

test "readTracePoints with empty input" {
    const allocator = testing.allocator;
    const empty_gpx = "";

    const points = try readTracePoints(allocator, empty_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 0), points.len);
}

test "readTracePoints with no track points" {
    const allocator = testing.allocator;
    const no_points_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <name>Empty Track</name>
        \\  <trkseg>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, no_points_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 0), points.len);
}

test "readTracePoints with single point" {
    const allocator = testing.allocator;
    const single_point_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="45.5" lon="-122.5"><ele>250.5</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, single_point_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 1), points.len);
    try testing.expectEqual(45.5, points[0][0]);
    try testing.expectEqual(-122.5, points[0][1]);
    try testing.expectEqual(250.5, points[0][2]);
}

test "readTracePoints with negative coordinates" {
    const allocator = testing.allocator;
    const negative_coords_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="-33.8688" lon="151.2093"><ele>10.0</ele></trkpt>
        \\   <trkpt lat="-34.0" lon="151.0"><ele>15.5</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, negative_coords_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 2), points.len);
    try testing.expectEqual(-33.8688, points[0][0]);
    try testing.expectEqual(151.2093, points[0][1]);
    try testing.expectEqual(-34.0, points[1][0]);
    try testing.expectEqual(151.0, points[1][1]);
}

test "readTracePoints with extreme elevation values" {
    const allocator = testing.allocator;
    const extreme_elevation_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="27.9881" lon="86.9250"><ele>8848.0</ele></trkpt>
        \\   <trkpt lat="35.8617" lon="14.3754"><ele>-10.5</ele></trkpt>
        \\   <trkpt lat="0.0" lon="0.0"><ele>0.0</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, extreme_elevation_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 3), points.len);
    try testing.expectEqual(8848.0, points[0][2]); // Mt. Everest
    try testing.expectEqual(-10.5, points[1][2]); // Below sea level
    try testing.expectEqual(0.0, points[2][2]); // Sea level
}

test "readTracePoints with multiple track segments" {
    const allocator = testing.allocator;
    const multi_segment_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="40.0" lon="-120.0"><ele>100.0</ele></trkpt>
        \\   <trkpt lat="40.1" lon="-120.1"><ele>110.0</ele></trkpt>
        \\  </trkseg>
        \\  <trkseg>
        \\   <trkpt lat="41.0" lon="-121.0"><ele>200.0</ele></trkpt>
        \\   <trkpt lat="41.1" lon="-121.1"><ele>210.0</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, multi_segment_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 4), points.len);
    try testing.expectEqual(40.0, points[0][0]);
    try testing.expectEqual(41.1, points[3][0]);
}

test "readTracePoints with high precision coordinates" {
    const allocator = testing.allocator;
    const high_precision_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="37.123456789" lon="-122.987654321"><ele>123.456789</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, high_precision_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 1), points.len);
    try testing.expectApproxEqAbs(37.123456789, points[0][0], 0.000000001);
    try testing.expectApproxEqAbs(-122.987654321, points[0][1], 0.000000001);
    try testing.expectApproxEqAbs(123.456789, points[0][2], 0.000001);
}

test "readTracePoints with scientific notation" {
    const allocator = testing.allocator;
    const scientific_notation_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="3.7e1" lon="-1.22e2"><ele>1.0e2</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, scientific_notation_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 1), points.len);
    try testing.expectApproxEqAbs(37.0, points[0][0], 0.01);
    try testing.expectApproxEqAbs(-122.0, points[0][1], 0.01);
    try testing.expectApproxEqAbs(100.0, points[0][2], 0.01);
}


test "readWaypoints parses waypoints correctly" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.000000" lon="7.000000">
        \\  <name>Checkpoint 10km</name>
        \\  <time>2025-11-20T12:00:00Z</time>
        \\ </wpt>
        \\ <wpt lat="45.005000" lon="7.005000">
        \\  <name>Checkpoint 20km</name>
        \\  <time>2025-11-20T14:00:00Z</time>
        \\ </wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| {
            wpt.deinit(allocator);
        }
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 2), waypoints.len);

    try testing.expectEqual(45.0, waypoints[0].lat);
    try testing.expectEqual(7.0, waypoints[0].lon);
    try testing.expectEqualStrings("Checkpoint 10km", waypoints[0].name);
    try testing.expect(waypoints[0].time != null);
    try testing.expectEqual(@as(i64, 1763640000), waypoints[0].time.?); // 2025-11-20T12:00:00Z

    try testing.expectEqual(45.005, waypoints[1].lat);
    try testing.expectEqual(7.005, waypoints[1].lon);
    try testing.expectEqualStrings("Checkpoint 20km", waypoints[1].name);
}

test "readWaypoints with no time element" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0">
        \\  <name>Simple Checkpoint</name>
        \\ </wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| {
            wpt.deinit(allocator);
        }
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 1), waypoints.len);
    try testing.expectEqualStrings("Simple Checkpoint", waypoints[0].name);
    try testing.expect(waypoints[0].time == null);
}

test "readGPXComplete parses both tracks and waypoints" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.000000" lon="7.000000">
        \\  <name>Checkpoint 10km</name>
        \\  <time>2025-11-20T12:00:00Z</time>
        \\ </wpt>
        \\ <wpt lat="45.010000" lon="7.010000">
        \\  <name>Checkpoint 20km</name>
        \\  <time>2025-11-20T14:00:00Z</time>
        \\ </wpt>
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="45.000000" lon="7.000000"><ele>300</ele></trkpt>
        \\   <trkpt lat="45.005000" lon="7.005000"><ele>320</ele></trkpt>
        \\   <trkpt lat="45.010000" lon="7.010000"><ele>340</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    var gpx_data = try readGPXComplete(allocator, sample_gpx);
    defer gpx_data.deinit(allocator);

    try testing.expectEqual(@as(usize, 3), gpx_data.trace.points.len);
    try testing.expectEqual(@as(usize, 2), gpx_data.waypoints.len);

    try testing.expectEqual(45.0, gpx_data.trace.points[0][0]);
    try testing.expectEqual(300.0, gpx_data.trace.points[0][2]);

    try testing.expectEqualStrings("Checkpoint 10km", gpx_data.waypoints[0].name);
    try testing.expectEqualStrings("Checkpoint 20km", gpx_data.waypoints[1].name);
}


test "readGPXComplete: legs null when no waypoints" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="45.0" lon="7.0"><ele>300</ele></trkpt>
        \\   <trkpt lat="45.01" lon="7.01"><ele>320</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    var gpx_data = try readGPXComplete(allocator, sample_gpx);
    defer gpx_data.deinit(allocator);

    try testing.expectEqual(@as(usize, 2), gpx_data.trace.points.len);
    try testing.expectEqual(@as(usize, 0), gpx_data.waypoints.len);
    try testing.expect(gpx_data.legs == null);
}

test "readGPXComplete: legs null when single waypoint" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0"><name>Only</name></wpt>
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="45.0" lon="7.0"><ele>300</ele></trkpt>
        \\   <trkpt lat="45.01" lon="7.01"><ele>320</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    var gpx_data = try readGPXComplete(allocator, sample_gpx);
    defer gpx_data.deinit(allocator);

    try testing.expectEqual(@as(usize, 1), gpx_data.waypoints.len);
    try testing.expect(gpx_data.legs == null);
}

test "readGPXComplete: legs computed with multiple waypoints" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0"><name>Start</name></wpt>
        \\ <wpt lat="45.05" lon="7.05"><name>Mid</name></wpt>
        \\ <wpt lat="45.10" lon="7.10"><name>End</name></wpt>
        \\ <trk>
        \\  <trkseg>
        \\   <trkpt lat="45.00" lon="7.00"><ele>100</ele></trkpt>
        \\   <trkpt lat="45.01" lon="7.01"><ele>120</ele></trkpt>
        \\   <trkpt lat="45.02" lon="7.02"><ele>140</ele></trkpt>
        \\   <trkpt lat="45.03" lon="7.03"><ele>160</ele></trkpt>
        \\   <trkpt lat="45.04" lon="7.04"><ele>180</ele></trkpt>
        \\   <trkpt lat="45.05" lon="7.05"><ele>200</ele></trkpt>
        \\   <trkpt lat="45.06" lon="7.06"><ele>220</ele></trkpt>
        \\   <trkpt lat="45.07" lon="7.07"><ele>240</ele></trkpt>
        \\   <trkpt lat="45.08" lon="7.08"><ele>260</ele></trkpt>
        \\   <trkpt lat="45.09" lon="7.09"><ele>280</ele></trkpt>
        \\   <trkpt lat="45.10" lon="7.10"><ele>300</ele></trkpt>
        \\  </trkseg>
        \\ </trk>
        \\</gpx>
    ;

    var gpx_data = try readGPXComplete(allocator, sample_gpx);
    defer gpx_data.deinit(allocator);

    try testing.expectEqual(@as(usize, 11), gpx_data.trace.points.len);
    try testing.expectEqual(@as(usize, 3), gpx_data.waypoints.len);

    // Verify legs were computed
    try testing.expect(gpx_data.legs != null);
    const legs = gpx_data.legs.?;
    try testing.expectEqual(@as(usize, 2), legs.len);

    // Verify leg properties
    for (legs) |leg| {
        try testing.expect(leg.totalDistance > 0.0);
        try testing.expect(leg.totalElevation > 0.0);
        try testing.expect(leg.startIndex < leg.endIndex);
        try testing.expect(leg.pointCount > 0);
    }
}

test "readWaypoints: handles time parsing correctly" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0">
        \\  <name>With Time</name>
        \\  <time>2025-11-20T12:00:00Z</time>
        \\ </wpt>
        \\ <wpt lat="45.1" lon="7.1">
        \\  <name>Without Time</name>
        \\ </wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| {
            wpt.deinit(allocator);
        }
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 2), waypoints.len);

    // First waypoint has time
    try testing.expect(waypoints[0].time != null);
    try testing.expectEqual(@as(i64, 1763640000), waypoints[0].time.?); // 2025-11-20T12:00:00Z

    // Second waypoint has no time
    try testing.expect(waypoints[1].time == null);
}

test "readWaypoints: missing name yields empty string" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0">
        \\ </wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| wpt.deinit(allocator);
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 1), waypoints.len);
    try testing.expectEqualStrings("", waypoints[0].name);
}

test "readWaypoints: wptType field parsed correctly" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0">
        \\  <name>Start Line</name>
        \\  <type>Start</type>
        \\ </wpt>
        \\ <wpt lat="45.1" lon="7.1">
        \\  <name>Life Base</name>
        \\  <type>LifeBase</type>
        \\ </wpt>
        \\ <wpt lat="45.2" lon="7.2">
        \\  <name>Barrier</name>
        \\  <type>TimeBarrier</type>
        \\ </wpt>
        \\ <wpt lat="45.3" lon="7.3">
        \\  <name>Finish</name>
        \\  <type>Arrival</type>
        \\ </wpt>
        \\ <wpt lat="45.4" lon="7.4">
        \\  <name>Aid</name>
        \\ </wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| wpt.deinit(allocator);
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 5), waypoints.len);
    try testing.expectEqualStrings("Start", waypoints[0].wptType.?);
    try testing.expectEqualStrings("LifeBase", waypoints[1].wptType.?);
    try testing.expectEqualStrings("TimeBarrier", waypoints[2].wptType.?);
    try testing.expectEqualStrings("Arrival", waypoints[3].wptType.?);
    try testing.expect(waypoints[4].wptType == null);

    try testing.expect(waypoints[0].isStageBoundary());
    try testing.expect(waypoints[1].isStageBoundary());
    try testing.expect(!waypoints[2].isStageBoundary());
    try testing.expect(waypoints[3].isStageBoundary());
    try testing.expect(!waypoints[4].isStageBoundary());

    try testing.expect(waypoints[2].isSectionBoundary());
    try testing.expect(!waypoints[4].isSectionBoundary());
}

test "readTracePoints: malformed points are skipped, valid ones retained" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <trk><trkseg>
        \\  <trkpt lat="45.0" lon="7.0"><ele>100</ele></trkpt>
        \\  <trkpt lon="7.1"><ele>110</ele></trkpt>
        \\  <trkpt lat="45.2" lon="7.2"><ele>120</ele></trkpt>
        \\  <trkpt lat="45.3" lon="7.3"></trkpt>
        \\  <trkpt lat="45.4" lon="7.4"><ele>140</ele></trkpt>
        \\ </trkseg></trk>
        \\</gpx>
    ;

    const points = try readTracePoints(allocator, sample_gpx);
    defer allocator.free(points);

    // Missing lat and missing ele are skipped; the other 3 valid points are kept
    try testing.expectEqual(@as(usize, 3), points.len);
    try testing.expectApproxEqAbs(45.0, points[0][0], 0.001);
    try testing.expectApproxEqAbs(45.2, points[1][0], 0.001);
    try testing.expectApproxEqAbs(45.4, points[2][0], 0.001);
}

test "readWaypoints: malformed waypoints are skipped, valid ones retained" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0"><name>Good 1</name></wpt>
        \\ <wpt lon="7.1"><name>No lat</name></wpt>
        \\ <wpt lat="45.2" lon="7.2"><name>Good 2</name></wpt>
        \\ <wpt lat="bad" lon="7.3"><name>Bad lat</name></wpt>
        \\ <wpt lat="45.4" lon="7.4"><name>Good 3</name></wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| wpt.deinit(allocator);
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 3), waypoints.len);
    try testing.expectEqualStrings("Good 1", waypoints[0].name);
    try testing.expectEqualStrings("Good 2", waypoints[1].name);
    try testing.expectEqualStrings("Good 3", waypoints[2].name);
}

test "parseTagContent: content bounded to element (does not bleed into next element)" {
    const allocator = testing.allocator;
    // Two waypoints: first has no <desc>, second does. Parser must not steal second's desc.
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0">
        \\  <name>First</name>
        \\ </wpt>
        \\ <wpt lat="45.1" lon="7.1">
        \\  <name>Second</name>
        \\  <desc>Only second has this</desc>
        \\ </wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| wpt.deinit(allocator);
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 2), waypoints.len);
    try testing.expect(waypoints[0].desc == null);
    try testing.expectEqualStrings("Only second has this", waypoints[1].desc.?);
}

test "parseTagContent: empty tag content returns empty slice" {
    const allocator = testing.allocator;
    const sample_gpx =
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1">
        \\ <wpt lat="45.0" lon="7.0">
        \\  <name></name>
        \\  <desc></desc>
        \\ </wpt>
        \\</gpx>
    ;

    const waypoints = try readWaypoints(allocator, sample_gpx);
    defer {
        for (waypoints) |*wpt| wpt.deinit(allocator);
        allocator.free(waypoints);
    }

    try testing.expectEqual(@as(usize, 1), waypoints.len);
    try testing.expectEqualStrings("", waypoints[0].name);
    try testing.expectEqualStrings("", waypoints[0].desc.?);
}
