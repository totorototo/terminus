const std = @import("std");
const SectionStats = @import("section.zig").SectionStats;

pub const Waypoint = struct {
    lat: f64,
    lon: f64,
    name: []const u8,
    time: ?[]const u8, // Optional ISO8601 time string

    pub fn deinit(self: *Waypoint, allocator: std.mem.Allocator) void {
        allocator.free(self.name);
        if (self.time) |t| {
            allocator.free(t);
        }
    }
};

pub const GPXData = struct {
    trace_points: [][3]f64,
    waypoints: []Waypoint,
    sections: ?[]const SectionStats, // Optional: available when waypoints exist

    pub fn deinit(self: *GPXData, allocator: std.mem.Allocator) void {
        allocator.free(self.trace_points);
        for (self.waypoints) |*wpt| {
            wpt.deinit(allocator);
        }
        allocator.free(self.waypoints);
        if (self.sections) |sections| {
            // Free points arrays within each section
            for (sections) |section| {
                allocator.free(section.points);
            }
            allocator.free(sections);
        }
    }
};
