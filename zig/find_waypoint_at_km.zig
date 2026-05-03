/// CLI tool: find track point coordinates at given km distances along a GPX trace.
/// Uses the same Trace.init (Douglas-Peucker + Haversine) as the app, so distances match exactly.
///
/// Usage: zig run zig/find_waypoint_at_km.zig -- <file.gpx> <km1> [km2 ...]
/// Example: zig run zig/find_waypoint_at_km.zig -- public/vvx-xgtv-2026-normal.gpx 36.5 74 109.5

const std = @import("std");
const Trace = @import("trace.zig").Trace;
const readTracePoints = @import("gpx.zig").readTracePoints;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 3) {
        std.debug.print("Usage: {s} <file.gpx> <km1> [km2 ...]\n", .{args[0]});
        std.process.exit(1);
    }

    const gpx_path = args[1];

    const file = try std.fs.cwd().openFile(gpx_path, .{});
    defer file.close();
    const bytes = try file.readToEndAlloc(allocator, 256 * 1024 * 1024);
    defer allocator.free(bytes);

    const raw_points = try readTracePoints(allocator, bytes);
    defer allocator.free(raw_points);

    var trace = try Trace.init(allocator, raw_points);
    defer trace.deinit(allocator);

    std.debug.print("Track: {s}\n", .{gpx_path});
    std.debug.print("Points after simplification: {d}\n", .{trace.points.len});
    std.debug.print("Total distance: {d:.3} km\n\n", .{trace.totalDistance / 1000.0});

    for (args[2..]) |km_arg| {
        const target_km = std.fmt.parseFloat(f64, km_arg) catch {
            std.debug.print("Invalid km value: {s}\n", .{km_arg});
            continue;
        };
        const target_m = target_km * 1000.0;

        // Find the index with cumulative distance closest to target
        var best_idx: usize = 0;
        var best_diff: f64 = std.math.floatMax(f64);
        for (trace.cumulativeDistances, 0..) |d, i| {
            const diff = @abs(d - target_m);
            if (diff < best_diff) {
                best_diff = diff;
                best_idx = i;
            }
        }

        const pt = trace.points[best_idx];
        const actual_km = trace.cumulativeDistances[best_idx] / 1000.0;
        std.debug.print("Target {d:.1} km → index {d}, actual {d:.3} km, delta {d:.0} m\n", .{
            target_km, best_idx, actual_km, best_diff,
        });
        std.debug.print("  lat={d:.6}  lon={d:.6}  ele={d:.1}\n\n", .{ pt[0], pt[1], pt[2] });
    }
}
