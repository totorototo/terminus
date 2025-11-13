const std = @import("std");
const Point = @import("waypoint.zig").Point;
const Trace = @import("trace.zig").Trace;
const gpx = @import("gpx.zig");
const csv = @import("csv.zig");
const name = @import("name.zig");

pub fn main() !void {
    const allocator = std.heap.page_allocator;

    // Create test directory if it doesn't exist
    std.fs.cwd().makeDir("test") catch |err| {
        if (err != error.PathAlreadyExists) return err;
    };

    // Generate GPX and CSV files into test directory
    try gpx.generateAndSaveGPX(allocator, "test/random_160km_trail.gpx");
    std.debug.print("GPX file 'test/random_160km_trail.gpx' generated successfully.\n", .{});

    try csv.generateAndSaveRandomCheckpointsCSV(allocator, "test/random_checkpoints.csv");
    std.debug.print("CSV file 'test/random_checkpoints.csv' generated successfully.\n", .{});

    var rng = std.Random.DefaultPrng.init(12345);
    const random = rng.random();
    if (name.generateIkeaName(allocator, random)) |ikea_name| {
        std.debug.print("Generated IKEA-style name: {s}\n", .{ikea_name});
        allocator.free(ikea_name);
    } else |err| {
        std.debug.print("Error generating IKEA name: {}\n", .{err});
    }

    // Define GPS points as [3]f64 arrays [lon, lat, elevation]
    const points = [_][3]f64{
        .{ 12.492373, 41.890251, 21.00 }, // Colosseum in Rome
        .{ 2.294481, 48.858844, 35.00 }, // Eiffel Tower in Paris
        .{ -0.127758, 51.507351, 15.00 }, // London
        .{ -74.0060, 40.7128, 10.00 }, // New York City
    };

    // Initialize the trace
    var trace = try Trace.init(allocator, &points);
    defer trace.deinit(allocator);

    // Print total distance
    const totalDistanceKm = trace.totalDistance / 1000.0;
    std.debug.print("Total Distance: {:.2} km\n", .{totalDistanceKm});

    std.debug.print("Total Elevation Gain: {:.2} meters\n", .{trace.totalElevation});
    std.debug.print("Total Elevation Loss: {:.2} meters\n", .{trace.totalElevationLoss});

    // Use sliceBetweenDistances to get points between distances
    const sliceResultKmRange = trace.sliceBetweenDistances(0.001, 2.5);
    if (sliceResultKmRange) |slice| {
        for (slice) |point| {
            std.debug.print("Point at ({d:.6}, {d:.6}, elevation {d:.2} meters)\n", .{ point[0], point[1], point[2] });
        }
    } else {
        std.debug.print("No points found within the specified range.\n", .{});
    }
}
