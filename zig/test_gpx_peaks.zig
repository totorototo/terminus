const std = @import("std");
const peaks = @import("peaks.zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Read GPX file
    const gpx_path = "public/vvx-xgtv-2026.gpx";
    const file = try std.fs.cwd().openFile(gpx_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024 * 10); // 10MB max
    defer allocator.free(content);

    // Extract elevations using simple parsing
    var elevations = std.ArrayList(f32){};
    defer elevations.deinit(allocator);

    var lines = std.mem.splitSequence(u8, content, "\n");
    while (lines.next()) |line| {
        const trimmed = std.mem.trim(u8, line, " \t\r");
        if (std.mem.startsWith(u8, trimmed, "<ele>")) {
            const start = 5; // len("<ele>")
            if (std.mem.indexOf(u8, trimmed, "</ele>")) |end| {
                const ele_str = trimmed[start..end];
                if (std.fmt.parseFloat(f32, ele_str)) |ele| {
                    try elevations.append(allocator, ele);
                } else |_| {}
            }
        }
    }

    std.debug.print("Found {d} elevation points\n", .{elevations.items.len});

    if (elevations.items.len == 0) {
        std.debug.print("No elevations found\n", .{});
        return;
    }

    // Run findPeaks
    const found_peaks = try peaks.findPeaks(allocator, elevations.items);
    defer allocator.free(found_peaks);

    std.debug.print("Found {d} peaks:\n", .{found_peaks.len});
    for (found_peaks) |peak_idx| {
        std.debug.print("  Index: {d}, Elevation: {d:.1}m\n", .{ peak_idx, elevations.items[peak_idx] });
    }
}
