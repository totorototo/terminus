const std = @import("std");

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

// Tests
const testing = std.testing;

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
