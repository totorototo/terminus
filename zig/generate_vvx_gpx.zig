const std = @import("std");
const Trace = @import("trace.zig").Trace;
const gpx = @import("gpx.zig");
const Waypoint = @import("gpxdata.zig").Waypoint;

const CheckpointCSV = struct {
    location: []const u8,
    label: []const u8,
    km: f64,
    kind: []const u8,
    cutoff_time: []const u8, // Format: "2026-05-13 10:00:00"
};

fn parseCSVLine(allocator: std.mem.Allocator, line: []const u8) !?CheckpointCSV {
    var fields = std.ArrayList([]const u8).init(allocator);
    defer fields.deinit();

    var iter = std.mem.splitSequence(u8, line, ",");
    while (iter.next()) |field| {
        const trimmed = std.mem.trim(u8, field, " \t\r\n");
        try fields.append(trimmed);
    }

    if (fields.items.len != 5) return null;

    const km = std.fmt.parseFloat(f64, fields.items[2]) catch return null;

    return CheckpointCSV{
        .location = try allocator.dupe(u8, fields.items[0]),
        .label = try allocator.dupe(u8, fields.items[1]),
        .km = km,
        .kind = try allocator.dupe(u8, fields.items[3]),
        .cutoff_time = try allocator.dupe(u8, fields.items[4]),
    };
}

fn parseDateTimeToUTC(datetime_str: []const u8, buffer: []u8) ![]const u8 {
    // Input: "2026-05-13 10:00:00"
    // Output: "2026-05-13T10:00:00Z"

    if (datetime_str.len < 19) return error.InvalidDateTime;

    const date_part = datetime_str[0..10]; // "2026-05-13"
    const time_part = datetime_str[11..19]; // "10:00:00"

    return std.fmt.bufPrint(buffer, "{s}T{s}Z", .{ date_part, time_part });
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const gpx_input_path = "../src/assets/vvx-xgtv-2026.gpx";
    const csv_input_path = "../src/assets/vvx-xgtv-2026.csv";
    const gpx_output_path = "../src/assets/vvx-xgtv-2026-with-waypoints.gpx";

    std.debug.print("📖 Reading GPX file: {s}\n", .{gpx_input_path});

    // Read the GPX file
    const gpx_file = try std.fs.cwd().openFile(gpx_input_path, .{});
    defer gpx_file.close();

    const gpx_content = try gpx_file.readToEndAlloc(allocator, 100 * 1024 * 1024);
    defer allocator.free(gpx_content);

    // Parse GPX
    var gpx_data = try gpx.readGPXComplete(allocator, gpx_content);
    defer gpx_data.deinit(allocator);

    std.debug.print("✅ Loaded {d} track points\n", .{gpx_data.trace_points.len});

    // Create trace
    var trace = try Trace.init(allocator, gpx_data.trace_points);
    defer trace.deinit(allocator);

    std.debug.print("📏 Total distance: {d:.2} km\n", .{trace.totalDistance / 1000.0});

    // Read CSV file
    std.debug.print("\n📖 Reading CSV file: {s}\n", .{csv_input_path});

    const csv_file = try std.fs.cwd().openFile(csv_input_path, .{});
    defer csv_file.close();

    const csv_content = try csv_file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(csv_content);

    // Parse CSV
    var checkpoints = std.ArrayList(CheckpointCSV).init(allocator);
    defer {
        for (checkpoints.items) |cp| {
            allocator.free(cp.location);
            allocator.free(cp.label);
            allocator.free(cp.kind);
            allocator.free(cp.cutoff_time);
        }
        checkpoints.deinit();
    }

    var line_iter = std.mem.splitSequence(u8, csv_content, "\n");
    var is_header = true;

    while (line_iter.next()) |line| {
        if (is_header) {
            is_header = false;
            continue;
        }

        const trimmed = std.mem.trim(u8, line, " \t\r\n");
        if (trimmed.len == 0) continue;

        if (try parseCSVLine(allocator, trimmed)) |checkpoint| {
            try checkpoints.append(checkpoint);
            std.debug.print("  ✓ {s} at {d:.1} km\n", .{ checkpoint.location, checkpoint.km });
        }
    }

    std.debug.print("\n✅ Loaded {d} checkpoints from CSV\n", .{checkpoints.items.len});

    // Convert checkpoints to waypoints
    var waypoints = std.ArrayList(Waypoint).init(allocator);
    defer waypoints.deinit();

    std.debug.print("\n🔄 Converting checkpoints to waypoints...\n", .{});

    for (checkpoints.items) |checkpoint| {
        const distance_meters = checkpoint.km * 1000.0;
        const point = trace.pointAtDistance(distance_meters);

        if (point) |p| {
            var time_buffer: [32]u8 = undefined;
            const utc_time = try parseDateTimeToUTC(checkpoint.cutoff_time, &time_buffer);

            const waypoint = Waypoint{
                .name = try allocator.dupe(u8, checkpoint.location),
                .lat = p[0], // p[0] is latitude
                .lon = p[1], // p[1] is longitude
                .time = try allocator.dupe(u8, utc_time),
            };

            try waypoints.append(waypoint);

            std.debug.print("  ✓ {s}: lat={d:.6}, lon={d:.6}, time={s}\n", .{
                checkpoint.location,
                p[0],
                p[1],
                utc_time,
            });
        } else {
            std.debug.print("  ⚠️  Could not find point for {s} at {d:.1} km\n", .{
                checkpoint.location,
                checkpoint.km,
            });
        }
    }

    // Generate new GPX with waypoints
    std.debug.print("\n💾 Generating GPX with waypoints: {s}\n", .{gpx_output_path});

    const output_file = try std.fs.cwd().createFile(gpx_output_path, .{});
    defer output_file.close();

    const writer = output_file.writer();

    // Write GPX header
    try writer.writeAll(
        \\<?xml version="1.0" encoding="UTF-8"?>
        \\<gpx version="1.1" creator="Terminus GPX Generator"
        \\  xmlns="http://www.topografix.com/GPX/1/1"
        \\  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        \\  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
        \\  <metadata>
        \\    <name>VVX XGTV 2026</name>
        \\    <desc>VVX XGTV 2026 Trail with Checkpoints</desc>
        \\  </metadata>
        \\
    );

    // Write waypoints
    for (waypoints.items) |wpt| {
        try writer.print(
            \\  <wpt lat="{d:.6}" lon="{d:.6}">
            \\    <time>{s}</time>
            \\    <name>{s}</name>
            \\  </wpt>
            \\
        , .{ wpt.lat, wpt.lon, wpt.time.?, wpt.name });
    }

    // Write track
    try writer.writeAll(
        \\  <trk>
        \\    <name>VVX XGTV 2026 Track</name>
        \\    <trkseg>
        \\
    );

    for (gpx_data.trace_points) |point| {
        try writer.print(
            \\      <trkpt lat="{d:.6}" lon="{d:.6}">
            \\        <ele>{d:.1}</ele>
            \\      </trkpt>
            \\
        , .{ point[0], point[1], point[2] });
    }

    try writer.writeAll(
        \\    </trkseg>
        \\  </trk>
        \\</gpx>
        \\
    );

    std.debug.print("\n✅ GPX file generated successfully!\n", .{});
    std.debug.print("   {d} waypoints written\n", .{waypoints.items.len});
    std.debug.print("   {d} track points written\n", .{gpx_data.trace_points.len});

    // Cleanup waypoints
    for (waypoints.items) |*wpt| {
        wpt.deinit(allocator);
    }
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;
const expectEqual = testing.expectEqual;
const expectEqualStrings = testing.expectEqualStrings;

test "parseCSVLine: valid line with all fields" {
    const allocator = testing.allocator;

    const line = "Station Lioran,Départ,0.0,Depart,2026-05-13 10:00:00";
    const checkpoint = (try parseCSVLine(allocator, line)).?;
    defer {
        allocator.free(checkpoint.location);
        allocator.free(checkpoint.label);
        allocator.free(checkpoint.kind);
        allocator.free(checkpoint.cutoff_time);
    }

    try expectEqualStrings("Station Lioran", checkpoint.location);
    try expectEqualStrings("Départ", checkpoint.label);
    try expectEqual(@as(f64, 0.0), checkpoint.km);
    try expectEqualStrings("Depart", checkpoint.kind);
    try expectEqualStrings("2026-05-13 10:00:00", checkpoint.cutoff_time);
}

test "parseCSVLine: line with spaces around fields" {
    const allocator = testing.allocator;

    const line = " Col d'Eylac , CP1 , 33.5 , life base , 2026-05-13 20:00:00 ";
    const checkpoint = (try parseCSVLine(allocator, line)).?;
    defer {
        allocator.free(checkpoint.location);
        allocator.free(checkpoint.label);
        allocator.free(checkpoint.kind);
        allocator.free(checkpoint.cutoff_time);
    }

    try expectEqualStrings("Col d'Eylac", checkpoint.location);
    try expectEqualStrings("CP1", checkpoint.label);
    try expectEqual(@as(f64, 33.5), checkpoint.km);
    try expectEqualStrings("life base", checkpoint.kind);
    try expectEqualStrings("2026-05-13 20:00:00", checkpoint.cutoff_time);
}

test "parseCSVLine: invalid line with too few fields" {
    const allocator = testing.allocator;

    const line = "Station Lioran,Départ,0.0";
    const checkpoint = try parseCSVLine(allocator, line);

    try expectEqual(@as(?CheckpointCSV, null), checkpoint);
}

test "parseCSVLine: invalid line with too many fields" {
    const allocator = testing.allocator;

    const line = "Station Lioran,Départ,0.0,Depart,2026-05-13 10:00:00,extra";
    const checkpoint = try parseCSVLine(allocator, line);

    try expectEqual(@as(?CheckpointCSV, null), checkpoint);
}

test "parseCSVLine: invalid km value" {
    const allocator = testing.allocator;

    const line = "Station Lioran,Départ,invalid,Depart,2026-05-13 10:00:00";
    const checkpoint = try parseCSVLine(allocator, line);

    try expectEqual(@as(?CheckpointCSV, null), checkpoint);
}

test "parseCSVLine: empty line" {
    const allocator = testing.allocator;

    const line = "";
    const checkpoint = try parseCSVLine(allocator, line);

    try expectEqual(@as(?CheckpointCSV, null), checkpoint);
}

test "parseDateTimeToUTC: valid datetime" {
    var buffer: [32]u8 = undefined;

    const input = "2026-05-13 10:00:00";
    const result = try parseDateTimeToUTC(input, &buffer);

    try expectEqualStrings("2026-05-13T10:00:00Z", result);
}

test "parseDateTimeToUTC: different time" {
    var buffer: [32]u8 = undefined;

    const input = "2026-12-31 23:59:59";
    const result = try parseDateTimeToUTC(input, &buffer);

    try expectEqualStrings("2026-12-31T23:59:59Z", result);
}

test "parseDateTimeToUTC: midnight" {
    var buffer: [32]u8 = undefined;

    const input = "2026-01-01 00:00:00";
    const result = try parseDateTimeToUTC(input, &buffer);

    try expectEqualStrings("2026-01-01T00:00:00Z", result);
}

test "parseDateTimeToUTC: invalid - too short" {
    var buffer: [32]u8 = undefined;

    const input = "2026-05-13";
    const result = parseDateTimeToUTC(input, &buffer);

    try testing.expectError(error.InvalidDateTime, result);
}

test "parseDateTimeToUTC: invalid - empty string" {
    var buffer: [32]u8 = undefined;

    const input = "";
    const result = parseDateTimeToUTC(input, &buffer);

    try testing.expectError(error.InvalidDateTime, result);
}

test "CheckpointCSV: memory management" {
    const allocator = testing.allocator;

    const line = "Volvic,CP7,224.0,Arrivée,2026-05-16 00:00:00";
    const checkpoint = (try parseCSVLine(allocator, line)).?;

    // Verify fields are allocated
    try testing.expect(checkpoint.location.len > 0);
    try testing.expect(checkpoint.label.len > 0);
    try testing.expect(checkpoint.kind.len > 0);
    try testing.expect(checkpoint.cutoff_time.len > 0);

    // Cleanup
    allocator.free(checkpoint.location);
    allocator.free(checkpoint.label);
    allocator.free(checkpoint.kind);
    allocator.free(checkpoint.cutoff_time);
}

test "parseCSVLine: unicode characters" {
    const allocator = testing.allocator;

    const line = "Mont-Dore,CP4,134.5,life base,2026-05-14 23:40:00";
    const checkpoint = (try parseCSVLine(allocator, line)).?;
    defer {
        allocator.free(checkpoint.location);
        allocator.free(checkpoint.label);
        allocator.free(checkpoint.kind);
        allocator.free(checkpoint.cutoff_time);
    }

    try expectEqualStrings("Mont-Dore", checkpoint.location);
    try expectEqual(@as(f64, 134.5), checkpoint.km);
}

test "parseCSVLine: decimal km values" {
    const allocator = testing.allocator;

    const line = "Test,CP,123.456,test,2026-05-13 10:00:00";
    const checkpoint = (try parseCSVLine(allocator, line)).?;
    defer {
        allocator.free(checkpoint.location);
        allocator.free(checkpoint.label);
        allocator.free(checkpoint.kind);
        allocator.free(checkpoint.cutoff_time);
    }

    try testing.expectApproxEqAbs(@as(f64, 123.456), checkpoint.km, 0.001);
}

test "parseDateTimeToUTC: buffer boundary" {
    var buffer: [20]u8 = undefined; // Exactly 20 bytes needed for output

    const input = "2026-05-13 10:00:00";
    const result = try parseDateTimeToUTC(input, &buffer);

    try expectEqualStrings("2026-05-13T10:00:00Z", result);
    try expectEqual(@as(usize, 20), result.len);
}
