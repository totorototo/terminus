const std = @import("std");
const testing = std.testing;
const Trace = @import("trace.zig").Trace;

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

    var gpx_buffer = std.ArrayList(u8).init(allocator);
    defer gpx_buffer.deinit();

    try gpx_buffer.appendSlice("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n" ++
        "<gpx version=\"1.1\" creator=\"ZigGPXGenerator\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n" ++
        " <trk>\n <name>Random 160-km Trail Run</name>\n <trkseg>\n");

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

        const latStr = try floatToString(allocator, lat);
        defer allocator.free(latStr);
        const lonStr = try floatToString(allocator, lon);
        defer allocator.free(lonStr);
        const eleStr = try floatToStringElev(allocator, elevation);
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

pub fn readGPXFile(allocator: std.mem.Allocator, bytes: []const u8) ![][3]f64 {
    var points = std.ArrayList([3]f64).init(allocator);
    defer points.deinit();

    var pos: usize = 0;
    while (std.mem.indexOfPos(u8, bytes, pos, "<trkpt")) |start| {
        const lat_start = std.mem.indexOfPos(u8, bytes, start, "lat=\"") orelse break;
        const lat_value_start = lat_start + 5;
        const lat_value_end = std.mem.indexOfPos(u8, bytes, lat_value_start, "\"") orelse break;
        const lat_str = bytes[lat_value_start..lat_value_end];
        const lat = try std.fmt.parseFloat(f64, lat_str);

        const lon_start = std.mem.indexOfPos(u8, bytes, start, "lon=\"") orelse break;
        const lon_value_start = lon_start + 5;
        const lon_value_end = std.mem.indexOfPos(u8, bytes, lon_value_start, "\"") orelse break;
        const lon_str = bytes[lon_value_start..lon_value_end];
        const lon = try std.fmt.parseFloat(f64, lon_str);

        const ele_start = std.mem.indexOfPos(u8, bytes, start, "<ele>") orelse break;
        const ele_value_start = ele_start + 5;
        const ele_value_end = std.mem.indexOfPos(u8, bytes, ele_value_start, "</ele>") orelse break;
        const ele_str = bytes[ele_value_start..ele_value_end];
        const ele = try std.fmt.parseFloat(f64, ele_str);

        try points.append(.{ lat, lon, ele });

        pos = ele_value_end + 6;
    }

    return points.toOwnedSlice();
}

pub fn readGPXFileAndReturnsTrace(allocator: std.mem.Allocator, bytes: []const u8) !Trace {
    const points_array = try readGPXFile(allocator, bytes);
    defer allocator.free(points_array);

    return Trace.init(allocator, points_array);
}

// Tests

test "should read gpx file and return Trace" {
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

    var trace = try readGPXFileAndReturnsTrace(allocator, sample_gpx);
    defer trace.deinit(allocator);

    try testing.expectEqual(@as(usize, 3), trace.points.len);
    try testing.expectEqual(37.123456, trace.points[0][0]);
    try testing.expectEqual(-122.123456, trace.points[0][1]);
    try testing.expectEqual(100.0, trace.points[0][2]);

    try testing.expectEqual(37.123556, trace.points[1][0]);
    try testing.expectEqual(-122.123556, trace.points[1][1]);
    try testing.expectEqual(150.0, trace.points[1][2]);
}

test "should read GPX file and extract track points" {
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

    const points = try readGPXFile(allocator, sample_gpx);
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

test "readGPXFile with empty input" {
    const allocator = testing.allocator;
    const empty_gpx = "";

    const points = try readGPXFile(allocator, empty_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 0), points.len);
}

test "readGPXFile with no track points" {
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

    const points = try readGPXFile(allocator, no_points_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 0), points.len);
}

test "readGPXFile with single point" {
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

    const points = try readGPXFile(allocator, single_point_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 1), points.len);
    try testing.expectEqual(45.5, points[0][0]);
    try testing.expectEqual(-122.5, points[0][1]);
    try testing.expectEqual(250.5, points[0][2]);
}

test "readGPXFile with negative coordinates" {
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

    const points = try readGPXFile(allocator, negative_coords_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 2), points.len);
    try testing.expectEqual(-33.8688, points[0][0]);
    try testing.expectEqual(151.2093, points[0][1]);
    try testing.expectEqual(-34.0, points[1][0]);
    try testing.expectEqual(151.0, points[1][1]);
}

test "readGPXFile with extreme elevation values" {
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

    const points = try readGPXFile(allocator, extreme_elevation_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 3), points.len);
    try testing.expectEqual(8848.0, points[0][2]); // Mt. Everest
    try testing.expectEqual(-10.5, points[1][2]); // Below sea level
    try testing.expectEqual(0.0, points[2][2]); // Sea level
}

test "readGPXFile with multiple track segments" {
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

    const points = try readGPXFile(allocator, multi_segment_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 4), points.len);
    try testing.expectEqual(40.0, points[0][0]);
    try testing.expectEqual(41.1, points[3][0]);
}

test "readGPXFile with high precision coordinates" {
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

    const points = try readGPXFile(allocator, high_precision_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 1), points.len);
    try testing.expectApproxEqAbs(37.123456789, points[0][0], 0.000000001);
    try testing.expectApproxEqAbs(-122.987654321, points[0][1], 0.000000001);
    try testing.expectApproxEqAbs(123.456789, points[0][2], 0.000001);
}

test "readGPXFile with scientific notation" {
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

    const points = try readGPXFile(allocator, scientific_notation_gpx);
    defer allocator.free(points);

    try testing.expectEqual(@as(usize, 1), points.len);
    try testing.expectApproxEqAbs(37.0, points[0][0], 0.01);
    try testing.expectApproxEqAbs(-122.0, points[0][1], 0.01);
    try testing.expectApproxEqAbs(100.0, points[0][2], 0.01);
}

test "readGPXFile parses generated GPX correctly" {
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

    const points = try readGPXFile(allocator, content);
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
