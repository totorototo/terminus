const std = @import("std");
const Point = @import("waypoint.zig").Point;
const Trace = @import("trace.zig").Trace;

pub fn main() !void {
    const allocator = std.heap.page_allocator;

    // Define two GPS points
    const pointA = Point{
        .longitude = 12.492373,
        .latitude = 41.890251,
        .elevation = 21.00,
    }; // Colosseum in Rome

    const pointB = Point{
        .longitude = 2.294481,
        .latitude = 48.858844,
        .elevation = 35.00,
    }; // Eiffel Tower in Paris

    const pointC = Point{
        .longitude = -0.127758,
        .latitude = 51.507351,
        .elevation = 15.00,
    }; // London

    const pointD = Point{
        .longitude = -74.0060,
        .latitude = 40.7128,
        .elevation = 10.00,
    }; // New York City

    // Compute and print the distance between them
    const distance = pointA.distance(&pointB);
    std.debug.print("Distance between points: {:.2} meters\n", .{distance});
    const distanceKm = distance / 1000.0; // Convert meters to kilometers
    std.debug.print("Distance between points: {:.2} km\n", .{distanceKm});

    const bearing = pointA.bearingTo(&pointB);
    std.debug.print("Bearing from A to B: {:.2} degrees\n", .{bearing});

    const elevationDelta = pointA.elevationDelta(&pointB);
    std.debug.print("Elevation delta from A to B: {:.2} meters\n", .{elevationDelta});

    // Initialize the trace
    const points = [_]Point{
        pointA,
        pointB,
        pointC,
        pointD,
    };

    var trace = try Trace.init(allocator, &points);
    // Print total distance
    const totalDistanceKm = trace.totalDistance / 1000.0;
    std.debug.print("Total Distance: {:.2} km\n", .{totalDistanceKm});

    const totalElevationGain = trace.totalElevationGain();
    std.debug.print("Total Elevation Gain: {:.2} meters\n", .{totalElevationGain});

    // Use sliceBetweenDistances to get points between distances
    const sliceResultKmRange = trace.sliceBetweenDistances(0.001, 2.5);
    if (sliceResultKmRange) |slice| {
        for (slice) |point| {
            std.debug.print("Point at ({}, {}, elevation {} meters)\n", .{ point.longitude, point.latitude, point.elevation });
        }
    } else {
        std.debug.print("No points found within the specified range.\n", .{});
    }

    trace.deinit(allocator);
}
