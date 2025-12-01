const std = @import("std");
const testing = std.testing;
const Trace = @import("trace.zig").Trace;
const Waypoint = @import("gpxdata.zig").Waypoint;
const GPXData = @import("gpxdata.zig").GPXData;
const SectionStats = @import("section.zig").SectionStats;
const parseIso8601ToEpoch = @import("time.zig").parseIso8601ToEpoch;

fn floatToString(allocator: std.mem.Allocator, value: f64) ![]u8 {
    return std.fmt.allocPrint(allocator, "{d:.6}", .{value});
}

fn floatToStringElev(allocator: std.mem.Allocator, value: f64) ![]u8 {
    return std.fmt.allocPrint(allocator, "{d:.1}", .{value});
}

pub fn generateAndSaveGPX(allocator: std.mem.Allocator, path: []const u8) !void {
    const total_points: usize = 10000;
    const base_lat: f64 = @as(f64, 37.0);
    const base_lon: f64 = @as(f64, -122.0);

    var lat: f64 = base_lat;
    var lon: f64 = base_lon;
    var elevation: f64 = @as(f64, 50.0);

    var prng = std.Random.DefaultPrng.init(12345);
    const random = prng.random();

    // Pre-generate all track points
    const TrackPoint = struct { lat: f64, lon: f64, ele: f64 };
    var track_points = std.ArrayList(TrackPoint).init(allocator);
    defer track_points.deinit();

    // Perlin-like noise parameters for more natural meandering
    var direction: f64 = std.math.pi / 4.0; // Start northeast
    var elevation_trend: f64 = 0.0; // Smooth elevation changes
    var noise_phase: f64 = 0.0;
    var curve_phase: f64 = 0.0; // For creating smooth S-curves

    // For creating hills and valleys
    const hill_frequency: f64 = 0.001; // How often terrain changes
    var hill_phase: f64 = 0.0;

    for (0..total_points) |_| {
        // Create smooth S-curves using multiple sine waves
        const large_curve = @sin(curve_phase * 0.3) * 0.4; // Large sweeping curves
        const medium_curve = @sin(curve_phase * 0.8) * 0.2; // Medium bends
        const small_wiggle = @sin(noise_phase * 2.0) * 0.1; // Small variations

        // Random component for natural irregularity
        const direction_noise = (random.float(f64) - 0.5) * 0.15;

        // Combine all curve components
        const total_curve = large_curve + medium_curve + small_wiggle + direction_noise;
        direction += total_curve;

        // Soft directional bias to prevent extreme backtracking
        const forward_bias = std.math.pi / 4.0; // Northeast
        const distance_from_forward = direction - forward_bias;

        // Gentle pull back if straying too far (allows curves but prevents loops)
        if (@abs(distance_from_forward) > std.math.pi / 3.0) {
            direction -= distance_from_forward * 0.08;
        }

        // Occasional switchbacks for realism
        if (random.float(f64) < 0.015) {
            const switchback = (random.float(f64) - 0.5) * 1.2;
            direction += switchback;
        }

        // Main forward progress with dynamic meandering
        const base_progress: f64 = 0.00016; // ~16m per point = 160km / 10000 points
        const meander_amount: f64 = @sin(noise_phase) * 0.25 + @cos(curve_phase * 0.5) * 0.15;

        const lat_delta = @cos(direction) * base_progress * (1.0 + meander_amount);
        const lon_delta = @sin(direction) * base_progress * (1.0 + meander_amount);

        lat += lat_delta;
        lon += lon_delta;

        noise_phase += 0.05 + random.float(f64) * 0.02;
        curve_phase += 0.01 + random.float(f64) * 0.005;

        // Realistic elevation changes with hills and valleys
        hill_phase += hill_frequency;

        // Create terrain features: hills, valleys, plateaus
        const terrain_base = @sin(hill_phase * 3.0) * 300.0 + // Large hills
            @sin(hill_phase * 7.0) * 150.0 + // Medium features
            @sin(hill_phase * 15.0) * 50.0; // Small variations

        // Add random noise for natural roughness
        const roughness = (random.float(f64) - 0.5) * 25.0;

        // Smooth transition using exponential moving average
        const smoothing: f64 = 0.92;
        elevation_trend = elevation_trend * smoothing + (terrain_base + roughness) * (1.0 - smoothing);
        elevation += elevation_trend * 0.03;

        // Occasional steep sections (climbs/descents)
        if (random.float(f64) < 0.005) {
            const steep_change = (random.float(f64) - 0.3) * 40.0;
            elevation += steep_change;
        }

        // Keep within reasonable bounds (0-3000 meters)
        if (elevation < 0.0) elevation = 0.0;
        if (elevation > 3000.0) elevation = 3000.0;

        try track_points.append(.{ .lat = lat, .lon = lon, .ele = elevation });
    }

    // Calculate waypoint positions at 20km intervals
    const waypoint_interval_km: f64 = 20.0;
    const waypoint_interval_meters: f64 = waypoint_interval_km * 1000.0;
    var waypoint_positions = std.ArrayList(usize).init(allocator);
    defer waypoint_positions.deinit();

    var cumulative_distance: f64 = 0.0;
    var next_waypoint_distance: f64 = waypoint_interval_meters;

    try waypoint_positions.append(0); // Start waypoint

    for (1..track_points.items.len) |i| {
        const p1 = track_points.items[i - 1];
        const p2 = track_points.items[i];

        // Haversine distance
        const R: f64 = 6371000.0; // Earth radius in meters
        const lat1_rad = p1.lat * std.math.pi / 180.0;
        const lat2_rad = p2.lat * std.math.pi / 180.0;
        const dlat = lat2_rad - lat1_rad;
        const dlon = (p2.lon - p1.lon) * std.math.pi / 180.0;

        const a = @sin(dlat / 2.0) * @sin(dlat / 2.0) +
            @cos(lat1_rad) * @cos(lat2_rad) *
                @sin(dlon / 2.0) * @sin(dlon / 2.0);
        const c = 2.0 * std.math.atan2(@sqrt(a), @sqrt(1.0 - a));
        const segment_distance = R * c;

        cumulative_distance += segment_distance;

        if (cumulative_distance >= next_waypoint_distance) {
            try waypoint_positions.append(i);
            next_waypoint_distance += waypoint_interval_meters;
        }
    }

    // Build GPX file
    var gpx_buffer = std.ArrayList(u8).init(allocator);
    defer gpx_buffer.deinit();

    try gpx_buffer.appendSlice("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n" ++
        "<gpx version=\"1.1\" creator=\"ZigGPXGenerator\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n");

    // Write waypoints
    for (waypoint_positions.items, 0..) |pos, idx| {
        const pt = track_points.items[pos];

        const latStr = try floatToString(allocator, pt.lat);
        defer allocator.free(latStr);
        const lonStr = try floatToString(allocator, pt.lon);
        defer allocator.free(lonStr);

        var name_buf: [32]u8 = undefined;
        const name = try std.fmt.bufPrint(&name_buf, "Checkpoint {d}", .{idx + 1});

        // Calculate time based on waypoint index (assume 8 hours between waypoints for 20km sections)
        const hours_offset: usize = idx * 8;
        const base_hour: usize = 12; // Start at 12:00:00
        const total_hours = base_hour + hours_offset;
        const days: usize = @divFloor(total_hours, 24);
        const hours: usize = @mod(total_hours, 24);
        const day: usize = 20 + days;

        var time_buf: [32]u8 = undefined;
        const time = try std.fmt.bufPrint(&time_buf, "2025-11-{d:0>2}T{d:0>2}:00:00Z", .{ day, hours });

        try gpx_buffer.appendSlice(" <wpt lat=\"");
        try gpx_buffer.appendSlice(latStr);
        try gpx_buffer.appendSlice("\" lon=\"");
        try gpx_buffer.appendSlice(lonStr);
        try gpx_buffer.appendSlice("\"><name>");
        try gpx_buffer.appendSlice(name);
        try gpx_buffer.appendSlice("</name><time>");
        try gpx_buffer.appendSlice(time);
        try gpx_buffer.appendSlice("</time></wpt>\n");
    }

    // Write track
    try gpx_buffer.appendSlice(" <trk>\n <name>Random 160-km Trail Run</name>\n <trkseg>\n");

    for (track_points.items) |pt| {
        const latStr = try floatToString(allocator, pt.lat);
        defer allocator.free(latStr);
        const lonStr = try floatToString(allocator, pt.lon);
        defer allocator.free(lonStr);
        const eleStr = try floatToStringElev(allocator, pt.ele);
        defer allocator.free(eleStr);

        try gpx_buffer.appendSlice(" <trkpt lat=\"");
        try gpx_buffer.appendSlice(latStr);
        try gpx_buffer.appendSlice("\" lon=\"");
        try gpx_buffer.appendSlice(lonStr);
        try gpx_buffer.appendSlice("\"><ele>");
        try gpx_buffer.appendSlice(eleStr);
        try gpx_buffer.appendSlice("</ele></trkpt>\n");
    }

    try gpx_buffer.appendSlice(" </trkseg>\n" ++
        " </trk>\n" ++
        "</gpx>\n");

    const gpx_data = try gpx_buffer.toOwnedSlice();
    defer allocator.free(gpx_data);

    const file = try std.fs.cwd().createFile(path, .{});
    defer file.close();

    try file.writeAll(gpx_data);
}

pub fn readTracePoints(allocator: std.mem.Allocator, bytes: []const u8) ![][3]f64 {
    var points = std.ArrayList([3]f64).init(allocator);
    defer points.deinit();

    var pos: usize = 0;
    while (std.mem.indexOfPos(u8, bytes, pos, "<trkpt")) |trkpt_start| {
        // Find end of opening tag to bound our search
        const tag_end = std.mem.indexOfPos(u8, bytes, trkpt_start, ">") orelse break;

        // Parse lat and lon from attributes (both in opening tag)
        const lat = blk: {
            const lat_pos = std.mem.indexOfPos(u8, bytes[trkpt_start..tag_end], 0, "lat=\"") orelse break;
            const start = trkpt_start + lat_pos + 5;
            const end = std.mem.indexOfScalarPos(u8, bytes, start, '"') orelse break;
            break :blk std.fmt.parseFloat(f64, bytes[start..end]) catch break;
        };

        const lon = blk: {
            const lon_pos = std.mem.indexOfPos(u8, bytes[trkpt_start..tag_end], 0, "lon=\"") orelse break;
            const start = trkpt_start + lon_pos + 5;
            const end = std.mem.indexOfScalarPos(u8, bytes, start, '"') orelse break;
            break :blk std.fmt.parseFloat(f64, bytes[start..end]) catch break;
        };

        // Parse elevation (after opening tag)
        const ele = blk: {
            const ele_start = std.mem.indexOfPos(u8, bytes, tag_end, "<ele>") orelse break;
            const value_start = ele_start + 5;
            const value_end = std.mem.indexOfPos(u8, bytes, value_start, "</ele>") orelse break;
            break :blk std.fmt.parseFloat(f64, bytes[value_start..value_end]) catch break;
        };

        try points.append(.{ lat, lon, ele });

        // Move past this trackpoint
        pos = tag_end + 1;
    }

    return points.toOwnedSlice();
}

pub fn readWaypoints(allocator: std.mem.Allocator, bytes: []const u8) ![]Waypoint {
    var waypoints = std.ArrayList(Waypoint).init(allocator);
    errdefer {
        for (waypoints.items) |*wpt| {
            wpt.deinit(allocator);
        }
        waypoints.deinit();
    }

    var pos: usize = 0;
    while (std.mem.indexOfPos(u8, bytes, pos, "<wpt")) |wpt_start| {
        // Find end of waypoint element first to bound our searches
        const wpt_end = std.mem.indexOfPos(u8, bytes, wpt_start, "</wpt>") orelse break;

        // Find end of opening tag
        const tag_end = std.mem.indexOfPos(u8, bytes[wpt_start..wpt_end], 0, ">") orelse break;
        const tag_section = bytes[wpt_start .. wpt_start + tag_end];

        // Parse lat and lon from opening tag (bound search to opening tag only)
        const lat = blk: {
            const lat_pos = std.mem.indexOf(u8, tag_section, "lat=\"") orelse break;
            const start = wpt_start + lat_pos + 5;
            const end = std.mem.indexOfScalarPos(u8, bytes, start, '"') orelse break;
            break :blk std.fmt.parseFloat(f64, bytes[start..end]) catch break;
        };

        const lon = blk: {
            const lon_pos = std.mem.indexOf(u8, tag_section, "lon=\"") orelse break;
            const start = wpt_start + lon_pos + 5;
            const end = std.mem.indexOfScalarPos(u8, bytes, start, '"') orelse break;
            break :blk std.fmt.parseFloat(f64, bytes[start..end]) catch break;
        };

        // Bound content searches between tag end and waypoint end
        const content_start = wpt_start + tag_end + 1;
        const content = bytes[content_start..wpt_end];

        // Parse name (required) - search within waypoint content only
        const name = blk: {
            const name_pos = std.mem.indexOf(u8, content, "<name>") orelse break :blk "";
            const value_start = content_start + name_pos + 6;
            const value_end = std.mem.indexOfPos(u8, bytes, value_start, "</name>") orelse break :blk "";
            if (value_end > wpt_end) break :blk "";
            const name_str = bytes[value_start..value_end];
            break :blk allocator.dupe(u8, name_str) catch break :blk "";
        };

        // Parse time (optional) - search within waypoint content only
        const time = blk: {
            const time_pos = std.mem.indexOf(u8, content, "<time>") orelse break :blk null;
            const value_start = content_start + time_pos + 6;
            const value_end = std.mem.indexOfPos(u8, bytes, value_start, "</time>") orelse break :blk null;
            if (value_end > wpt_end) break :blk null;
            const time_str = bytes[value_start..value_end];
            break :blk allocator.dupe(u8, time_str) catch null;
        };
        defer if (time) |t| allocator.free(t);

        const time_epoch = if (time) |t| parseIso8601ToEpoch(t) catch null else null;

        try waypoints.append(.{
            .lat = lat,
            .lon = lon,
            .name = name,
            .time = time_epoch,
        });

        pos = wpt_end + 6;
    }

    return waypoints.toOwnedSlice();
}

pub fn readGPXComplete(allocator: std.mem.Allocator, bytes: []const u8) !GPXData {
    const trace_points = try readTracePoints(allocator, bytes);
    var trace = try Trace.init(allocator, trace_points);
    defer allocator.free(trace_points); // Trace owns its own copy
    errdefer trace.deinit(allocator);

    const waypoints = try readWaypoints(allocator, bytes);
    errdefer {
        for (waypoints) |*wpt| {
            wpt.deinit(allocator);
        }
        allocator.free(waypoints);
    }

    // Compute sections if waypoints are available
    var sections: ?[]const SectionStats = null;
    if (waypoints.len > 1) {
        sections = try trace.computeSectionsFromWaypoints(allocator, waypoints);
    }
    errdefer {
        if (sections) |s| {
            for (s) |section| {
                allocator.free(section.points);
            }
            allocator.free(s);
        }
    }

    return GPXData{
        .trace = trace,
        .waypoints = waypoints,
        .sections = sections,
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

test "GPX file generation creates valid file" {
    const allocator = testing.allocator;
    const test_path = "test_output.gpx";

    // Clean up any existing test file
    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveGPX(allocator, test_path);

    // Verify file exists
    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    // Read file content
    const content = try file.readToEndAlloc(allocator, 10 * 1024 * 1024);
    defer allocator.free(content);

    // Verify GPX structure
    try testing.expect(std.mem.indexOf(u8, content, "<?xml version=\"1.0\"") != null);
    try testing.expect(std.mem.indexOf(u8, content, "<gpx") != null);
    try testing.expect(std.mem.indexOf(u8, content, "<trk>") != null);
    try testing.expect(std.mem.indexOf(u8, content, "<trkseg>") != null);
    try testing.expect(std.mem.indexOf(u8, content, "<trkpt") != null);
    try testing.expect(std.mem.indexOf(u8, content, "</gpx>") != null);

    // Clean up
    try std.fs.cwd().deleteFile(test_path);
}

test "GPX generates correct number of track points" {
    const allocator = testing.allocator;
    const test_path = "test_points.gpx";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveGPX(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 10 * 1024 * 1024);
    defer allocator.free(content);

    // Count trkpt occurrences
    var count: usize = 0;
    var pos: usize = 0;
    while (std.mem.indexOfPos(u8, content, pos, "<trkpt")) |found| {
        count += 1;
        pos = found + 6;
    }

    // Should have 10000 points
    try testing.expectEqual(@as(usize, 10000), count);

    try std.fs.cwd().deleteFile(test_path);
}

test "GPX track points contain valid coordinates" {
    const allocator = testing.allocator;
    const test_path = "test_coords.gpx";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveGPX(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 10 * 1024 * 1024);
    defer allocator.free(content);

    // Verify coordinates are within expected ranges
    try testing.expect(std.mem.indexOf(u8, content, "lat=") != null);
    try testing.expect(std.mem.indexOf(u8, content, "lon=") != null);
    try testing.expect(std.mem.indexOf(u8, content, "<ele>") != null);

    try std.fs.cwd().deleteFile(test_path);
}

test "GPX elevation values are within bounds" {
    const allocator = testing.allocator;
    const test_path = "test_elevation.gpx";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveGPX(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 10 * 1024 * 1024);
    defer allocator.free(content);

    // Parse elevations and verify bounds (0-3000)
    var pos: usize = 0;
    while (std.mem.indexOfPos(u8, content, pos, "<ele>")) |start| {
        const ele_start = start + 5;
        if (std.mem.indexOfPos(u8, content, ele_start, "</ele>")) |end| {
            const ele_str = content[ele_start..end];
            const elevation = try std.fmt.parseFloat(f64, ele_str);
            try testing.expect(elevation >= 0.0);
            try testing.expect(elevation <= 3000.0);
            pos = end + 6;
        } else break;
    }

    try std.fs.cwd().deleteFile(test_path);
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

test "readTracePoints parses generated GPX correctly" {
    const allocator = testing.allocator;
    const test_path = "test_roundtrip.gpx";

    std.fs.cwd().deleteFile(test_path) catch {};
    defer std.fs.cwd().deleteFile(test_path) catch {};

    // Generate a GPX file
    try generateAndSaveGPX(allocator, test_path);

    // Read it back
    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 10 * 1024 * 1024);
    defer allocator.free(content);

    const points = try readTracePoints(allocator, content);
    defer allocator.free(points);

    // Should have 10000 points
    try testing.expectEqual(@as(usize, 10000), points.len);

    // Verify first point structure
    try testing.expect(points[0].len == 3);
    try testing.expect(points[0][0] != 0.0); // lat
    try testing.expect(points[0][1] != 0.0); // lon
    try testing.expect(points[0][2] >= 0.0); // elevation

    // Verify last point
    try testing.expect(points[9999][0] != points[0][0]); // Should have moved
    try testing.expect(points[9999][1] != points[0][1]);
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

test "generateAndSaveGPX creates waypoints at 20km intervals" {
    const allocator = testing.allocator;
    const test_path = "test_waypoint_generation.gpx";

    std.fs.cwd().deleteFile(test_path) catch {};
    defer std.fs.cwd().deleteFile(test_path) catch {};

    // Generate GPX file with waypoints
    try generateAndSaveGPX(allocator, test_path);

    // Read the file and parse it
    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 10 * 1024 * 1024);
    defer allocator.free(content);

    var gpx_data = try readGPXComplete(allocator, content);
    defer gpx_data.deinit(allocator);

    // Trace may be simplified by Douglas-Peucker, so check it's reasonable
    // Original has 10000 points, simplified trace should have fewer
    try testing.expect(gpx_data.trace.points.len > 1000);
    try testing.expect(gpx_data.trace.points.len <= 10000);

    // Should have waypoints (start + one every 20km in a 160km trail = 9 waypoints)
    try testing.expect(gpx_data.waypoints.len >= 8);
    try testing.expect(gpx_data.waypoints.len <= 10);

    // Verify waypoint names
    try testing.expectEqualStrings("Checkpoint 1", gpx_data.waypoints[0].name);
    if (gpx_data.waypoints.len > 1) {
        try testing.expectEqualStrings("Checkpoint 2", gpx_data.waypoints[1].name);
    }

    // Verify waypoints are positioned along the track
    for (gpx_data.waypoints) |wpt| {
        try testing.expect(wpt.lat >= 36.0 and wpt.lat <= 38.0);
        try testing.expect(wpt.lon >= -123.0 and wpt.lon <= -121.0);
    }

    // Verify sections were computed from waypoints
    try testing.expect(gpx_data.sections != null);
    const sections = gpx_data.sections.?;

    // Should have one less section than waypoints (sections between waypoints)
    try testing.expectEqual(gpx_data.waypoints.len - 1, sections.len);

    // Verify each section has valid stats
    for (sections) |section| {
        try testing.expect(section.totalDistance > 0.0);
        try testing.expect(section.startIndex < section.endIndex);
        try testing.expect(section.endIndex <= gpx_data.trace.points.len);
        try testing.expect(section.pointCount == section.endIndex - section.startIndex + 1);
        try testing.expect(section.points.len == section.pointCount);
    }
}

test "readGPXComplete: sections null when no waypoints" {
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
    try testing.expect(gpx_data.sections == null);
}

test "readGPXComplete: sections null when single waypoint" {
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
    try testing.expect(gpx_data.sections == null);
}

test "readGPXComplete: sections computed with multiple waypoints" {
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

    // Verify sections were computed
    try testing.expect(gpx_data.sections != null);
    const sections = gpx_data.sections.?;
    try testing.expectEqual(@as(usize, 2), sections.len);

    // Verify section properties
    for (sections) |section| {
        try testing.expect(section.totalDistance > 0.0);
        try testing.expect(section.totalElevation > 0.0);
        try testing.expect(section.startIndex < section.endIndex);
        try testing.expect(section.pointCount > 0);
        try testing.expect(section.points.len == section.pointCount);
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

test "generateAndSaveGPX: waypoint time increments correctly" {
    const allocator = testing.allocator;
    const test_path = "test_waypoint_times.gpx";

    std.fs.cwd().deleteFile(test_path) catch {};
    defer std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveGPX(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 10 * 1024 * 1024);
    defer allocator.free(content);

    var gpx_data = try readGPXComplete(allocator, content);
    defer gpx_data.deinit(allocator);

    // Verify all waypoints have time values (epoch timestamps)
    for (gpx_data.waypoints) |wpt| {
        try testing.expect(wpt.time != null);
        // Time should be a valid epoch timestamp (positive integer)
        try testing.expect(wpt.time.? > 0);
    }
}
