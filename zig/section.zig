const std = @import("std");

pub const SectionStats = struct {
    segmentId: usize,
    startIndex: usize,
    endIndex: usize,
    pointCount: usize,
    points: [][3]f64, // Array of points in this section [lat, lon, elevation]
    startPoint: [3]f64, // [lat, lon, elevation]
    endPoint: [3]f64, // [lat, lon, elevation]
    startLocation: []const u8, // Name/label of start checkpoint
    endLocation: []const u8, // Name/label of end checkpoint
    totalDistance: f64, // meters (renamed from distance)
    totalElevation: f64, // meters (renamed from elevation_gain)
    totalElevationLoss: f64, // meters (renamed from elevation_loss)
    avgSlope: f64, // percentage
    maxSlope: f64, // percentage
    minElevation: f64,
    maxElevation: f64,
    startTime: ?i64, // Unix epoch time in seconds
    endTime: ?i64, // Unix epoch time in seconds
    bearing: f64, // degrees from north
    difficulty: u8, // 1–5 (Tobler effort ratio vs flat terrain)
    estimatedDuration: f64, // seconds (Tobler hiking function estimate)
    maxCompletionTime: ?i64, // seconds allowed for this section (endTime - startTime), null if timestamps absent
};
