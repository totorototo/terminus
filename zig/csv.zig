const std = @import("std");

// Generate a random alphabetic string of given length for location names
fn randomString(rng: *std.Random.DefaultPrng, allocator: std.mem.Allocator, len: usize) ![]u8 {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const buf = try allocator.alloc(u8, len);
    const random = rng.random();
    for (buf) |*c| {
        const idx = random.intRangeAtMost(u8, 0, @as(u8, @intCast(letters.len - 1)));
        c.* = letters[idx];
    }
    return buf;
}

pub fn generateAndSaveRandomCheckpointsCSV(allocator: std.mem.Allocator, path: []const u8) !void {
    const total_checkpoints = 8; // including start and finish
    var rng = std.Random.DefaultPrng.init(12345);

    const kinds = [_][]const u8{ "Depart", "life base", "Arrivée" };

    // Open file for writing
    const file = try std.fs.cwd().createFile(path, .{});
    defer file.close();

    try file.writeAll("location,label,km,kind,cutoffTime\n");

    const km_step: f64 = 160.0 / @as(f64, @floatFromInt(total_checkpoints - 1));

    // Start datetime for cutoff times - 2026-05-13 10:00:00
    const base_year: u16 = 2026;
    const base_month: u8 = 5;
    const base_day: u8 = 13;
    const base_hour: u8 = 10;
    const base_minute: u8 = 0;

    const random = rng.random();
    for (0..total_checkpoints) |i| {
        const km = km_step * @as(f64, @floatFromInt(i));

        // Generate random location name 6-12 chars long
        const name_len = random.intRangeAtMost(usize, 6, 12);
        const location = try randomString(&rng, allocator, name_len);

        // Label: "Départ" if first, "Arrivée" if last, else "CP" + idx
        const label_str = if (i == 0)
            try allocator.dupe(u8, "Départ")
        else if (i == total_checkpoints - 1)
            try allocator.dupe(u8, "Arrivée")
        else
            try std.fmt.allocPrint(allocator, "CP{}", .{i});
        defer allocator.free(label_str);

        // Kind: First "Depart", last "Arrivée", else "life base"
        const kind = if (i == 0) kinds[0] else if (i == total_checkpoints - 1) kinds[2] else kinds[1];

        // Calculate cutoff time: add roughly 8-12 hours per CP + some minutes random
        var hour = base_hour + @as(u8, @intCast(i)) * 8 + random.intRangeAtMost(u8, 0, 4);
        const day = base_day + (hour / 24);
        hour = @as(u8, @intCast(hour % 24));

        // Format cutoffTime as "YYYY-MM-DD HH:mm:ss"
        const cutoffTime = try std.fmt.allocPrint(allocator, "{d:0>4}-{d:0>2}-{d:0>2} {d:0>2}:{d:0>2}:00", .{ base_year, base_month, day, hour, base_minute });

        // Write CSV line
        const writer = file.writer();
        try writer.print("{s},{s},{d:.1},{s},{s}\n", .{ location, label_str, km, kind, cutoffTime });

        allocator.free(location);
        allocator.free(cutoffTime);
    }
}

// Tests
const testing = std.testing;

test "CSV file generation creates valid file" {
    const allocator = testing.allocator;
    const test_path = "test_checkpoints.csv";

    // Clean up any existing test file
    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveRandomCheckpointsCSV(allocator, test_path);

    // Verify file exists
    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    // Read file content
    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    // Verify CSV header
    try testing.expect(std.mem.indexOf(u8, content, "location,label,km,kind,cutoffTime") != null);

    // Clean up
    try std.fs.cwd().deleteFile(test_path);
}

test "CSV generates correct number of checkpoints" {
    const allocator = testing.allocator;
    const test_path = "test_count.csv";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveRandomCheckpointsCSV(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    // Count lines (header + 8 checkpoints = 9 lines)
    var count: usize = 0;
    var iter = std.mem.splitScalar(u8, content, '\n');
    while (iter.next()) |_| {
        count += 1;
    }

    // Should have header + 8 checkpoints + empty line = 10
    try testing.expect(count >= 9);

    try std.fs.cwd().deleteFile(test_path);
}

test "CSV contains required fields" {
    const allocator = testing.allocator;
    const test_path = "test_fields.csv";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveRandomCheckpointsCSV(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    var iter = std.mem.splitScalar(u8, content, '\n');
    _ = iter.next(); // Skip header

    // Check first data line
    if (iter.next()) |line| {
        // Should have 5 comma-separated fields
        var field_count: usize = 0;
        var field_iter = std.mem.splitScalar(u8, line, ',');
        while (field_iter.next()) |_| {
            field_count += 1;
        }
        try testing.expectEqual(@as(usize, 5), field_count);
    }

    try std.fs.cwd().deleteFile(test_path);
}

test "CSV first checkpoint is Départ" {
    const allocator = testing.allocator;
    const test_path = "test_depart.csv";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveRandomCheckpointsCSV(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    var iter = std.mem.splitScalar(u8, content, '\n');
    _ = iter.next(); // Skip header

    if (iter.next()) |line| {
        // Second field should be "Départ"
        try testing.expect(std.mem.indexOf(u8, line, "Départ") != null);
        // Fourth field should be "Depart"
        try testing.expect(std.mem.indexOf(u8, line, "Depart") != null);
    }

    try std.fs.cwd().deleteFile(test_path);
}

test "CSV last checkpoint is Arrivée" {
    const allocator = testing.allocator;
    const test_path = "test_arrivee.csv";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveRandomCheckpointsCSV(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    // Find last non-empty line
    var lines = std.ArrayList([]const u8).init(allocator);
    defer lines.deinit();

    var iter = std.mem.splitScalar(u8, content, '\n');
    while (iter.next()) |line| {
        if (line.len > 0) {
            try lines.append(line);
        }
    }

    if (lines.items.len > 1) {
        const last_line = lines.items[lines.items.len - 1];
        try testing.expect(std.mem.indexOf(u8, last_line, "Arrivée") != null);
    }

    try std.fs.cwd().deleteFile(test_path);
}

test "CSV distance increases progressively" {
    const allocator = testing.allocator;
    const test_path = "test_distance.csv";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveRandomCheckpointsCSV(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    var iter = std.mem.splitScalar(u8, content, '\n');
    _ = iter.next(); // Skip header

    var prev_km: f64 = -1.0;
    while (iter.next()) |line| {
        if (line.len == 0) continue;

        // Extract km field (3rd field)
        var field_iter = std.mem.splitScalar(u8, line, ',');
        _ = field_iter.next(); // location
        _ = field_iter.next(); // label
        if (field_iter.next()) |km_str| {
            const km = try std.fmt.parseFloat(f64, km_str);
            if (prev_km >= 0) {
                try testing.expect(km >= prev_km);
            }
            prev_km = km;
        }
    }

    // Last distance should be 160km
    try testing.expectApproxEqAbs(@as(f64, 160.0), prev_km, 0.1);

    try std.fs.cwd().deleteFile(test_path);
}

test "CSV cutoff times are valid dates" {
    const allocator = testing.allocator;
    const test_path = "test_dates.csv";

    std.fs.cwd().deleteFile(test_path) catch {};

    try generateAndSaveRandomCheckpointsCSV(allocator, test_path);

    const file = try std.fs.cwd().openFile(test_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    var iter = std.mem.splitScalar(u8, content, '\n');
    _ = iter.next(); // Skip header

    while (iter.next()) |line| {
        if (line.len == 0) continue;

        // Extract cutoffTime field (5th field)
        var field_iter = std.mem.splitScalar(u8, line, ',');
        _ = field_iter.next(); // location
        _ = field_iter.next(); // label
        _ = field_iter.next(); // km
        _ = field_iter.next(); // kind
        if (field_iter.next()) |datetime| {
            // Should contain "2026" and ":"
            try testing.expect(std.mem.indexOf(u8, datetime, "2026") != null);
            try testing.expect(std.mem.indexOf(u8, datetime, ":") != null);
        }
    }

    try std.fs.cwd().deleteFile(test_path);
}
