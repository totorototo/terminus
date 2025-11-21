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
};
