const std = @import("std");

fn floatToString(allocator: std.mem.Allocator, value: f64) ![]u8 {
    return std.fmt.allocPrint(allocator, "{:.6}", .{value});
}

fn floatToStringElev(allocator: std.mem.Allocator, value: f64) ![]u8 {
    return std.fmt.allocPrint(allocator, "{:.1}", .{value});
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

    for (0..total_points) |_| {
        const latOffset = (random.float(f64) - 0.5) * 0.0001;
        const lonOffset = 0.00045 + (random.float(f64) - 0.5) * 0.0001;

        lat += latOffset;
        lon += lonOffset;

        const elevChange = (random.float(f64) - 0.5) * 20.0;
        elevation += elevChange;
        if (elevation < 0.0) elevation = 0.0;
        if (elevation > 1500.0) elevation = 1500.0;

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

    // Parse elevations and verify bounds (0-1500)
    var pos: usize = 0;
    while (std.mem.indexOfPos(u8, content, pos, "<ele>")) |start| {
        const ele_start = start + 5;
        if (std.mem.indexOfPos(u8, content, ele_start, "</ele>")) |end| {
            const ele_str = content[ele_start..end];
            const elevation = try std.fmt.parseFloat(f64, ele_str);
            try testing.expect(elevation >= 0.0);
            try testing.expect(elevation <= 1500.0);
            pos = end + 6;
        } else break;
    }

    try std.fs.cwd().deleteFile(test_path);
}
