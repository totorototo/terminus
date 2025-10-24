const std = @import("std");
const Trace = @import("trace.zig").Trace;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Create some example GPS points (longitude, latitude, elevation)
    const points = [_][3]f64{
        [3]f64{ -122.4194, 37.7749, 10.0 }, // San Francisco
        [3]f64{ -122.4094, 37.7849, 20.0 }, // Nearby point 1
        [3]f64{ -122.3994, 37.7949, 30.0 }, // Nearby point 2
        [3]f64{ -122.3894, 37.8049, 40.0 }, // Nearby point 3
        [3]f64{ -122.3794, 37.8149, 50.0 }, // Nearby point 4
    };

    // Initialize the trace
    var trace = try Trace.init(allocator, points[0..]);
    defer trace.deinit(allocator);

    std.debug.print("Trace initialized with {} points\n", .{trace.data.len});
    std.debug.print("Total distance: {d:.2} meters\n", .{trace.totalDistance});

    // Target point we want to find the closest point to
    const target_point = [3]f64{ -122.4044, 37.7899, 25.0 };

    std.debug.print("\nLooking for closest point to target: [{d:.4}, {d:.4}, {d:.1}]\n", .{ target_point[0], target_point[1], target_point[2] });

    // Find the closest point
    const result = trace.findClosestPoint(target_point);

    if (result) |closest| {
        std.debug.print("\nClosest point found:\n", .{});
        std.debug.print("  Index: {}\n", .{closest.index});
        std.debug.print("  Point: [{d:.4}, {d:.4}, {d:.1}]\n", .{ closest.point[0], closest.point[1], closest.point[2] });
        std.debug.print("  Distance: {d:.2} meters\n", .{closest.distance});

        // You can also access other trace data at this index
        std.debug.print("  Cumulative distance at this point: {d:.2} meters\n", .{trace.cumulativeDistances[closest.index]});
        std.debug.print("  Cumulative elevation gain: {d:.2} meters\n", .{trace.cumulativeElevations[closest.index]});
        std.debug.print("  Slope at this point: {d:.2}%\n", .{trace.slopes[closest.index]});
    } else {
        std.debug.print("No closest point found (empty trace)\n", .{});
    }

    // Example of using the result for further processing
    if (result) |closest| {
        // Get a slice of the trace starting from the closest point
        const remaining_distance = trace.totalDistance - trace.cumulativeDistances[closest.index];
        std.debug.print("\nRemaining distance from closest point: {d:.2} meters\n", .{remaining_distance});

        // You could slice the trace from this point forward
        const slice_start_distance = trace.cumulativeDistances[closest.index];
        const slice_end_distance = trace.totalDistance;
        const slice = trace.sliceBetweenDistances(slice_start_distance, slice_end_distance);

        if (slice) |s| {
            std.debug.print("Trace slice from closest point has {} points\n", .{s.len});
        }
    }
}
