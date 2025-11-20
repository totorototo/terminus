const std = @import("std");

pub const SectionStats = struct {
    start_index: usize,
    end_index: usize,
    point_count: usize,
    start_point: [3]f64, // [lat, lon, elevation]
    end_point: [3]f64, // [lat, lon, elevation]
    distance: f64, // meters
    elevation_gain: f64, // meters
    elevation_loss: f64, // meters
    avg_slope: f64, // percentage
    max_slope: f64, // percentage
    min_elevation: f64,
    max_elevation: f64,
};
