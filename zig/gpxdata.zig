const std = @import("std");
const SectionStats = @import("section.zig").SectionStats;
const Trace = @import("trace.zig").Trace;

pub const Waypoint = struct {
    lat: f64,
    lon: f64,
    name: []const u8,
    time: ?i64, // Unix epoch time in seconds

    pub fn deinit(self: *Waypoint, allocator: std.mem.Allocator) void {
        allocator.free(self.name);
    }
};

pub const GPXData = struct {
    trace: Trace,
    waypoints: []Waypoint,
    sections: ?[]const SectionStats, // Optional: available when waypoints exist

    pub fn deinit(self: *GPXData, allocator: std.mem.Allocator) void {
        self.trace.deinit(allocator);
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
