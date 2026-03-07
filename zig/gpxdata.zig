const std = @import("std");
const LegStats = @import("leg.zig").LegStats;
const SectionStats = @import("section.zig").SectionStats;
const StageStats = @import("stage.zig").StageStats;
const Trace = @import("trace.zig").Trace;

pub const Metadata = struct {
    name: ?[]const u8,
    description: ?[]const u8,

    pub fn deinit(self: *Metadata, allocator: std.mem.Allocator) void {
        if (self.name) |name| allocator.free(name);
        if (self.description) |desc| allocator.free(desc);
    }
};

pub const Waypoint = struct {
    lat: f64,
    lon: f64,
    ele: ?f64 = null, // elevation from <ele>
    name: []const u8,
    desc: ?[]const u8 = null, // description from <desc>
    cmt: ?[]const u8 = null, // comment from <cmt>
    sym: ?[]const u8 = null, // symbol from <sym>
    wptType: ?[]const u8 = null, // type from <type>: "Start", "TimeBarrier", "LifeBase", "Arrival", or null
    time: ?i64, // Unix epoch time in seconds (only present for typed waypoints)

    pub fn deinit(self: *Waypoint, allocator: std.mem.Allocator) void {
        allocator.free(self.name);
        if (self.desc) |d| allocator.free(d);
        if (self.cmt) |c| allocator.free(c);
        if (self.sym) |s| allocator.free(s);
        if (self.wptType) |t| allocator.free(t);
    }

    /// Returns true if this waypoint is a stage boundary (Start, LifeBase, or Arrival).
    pub fn isStageBoundary(self: *const Waypoint) bool {
        const t = self.wptType orelse return false;
        return std.mem.eql(u8, t, "Start") or std.mem.eql(u8, t, "LifeBase") or std.mem.eql(u8, t, "Arrival");
    }

    /// Returns true if this waypoint is a section boundary (any typed waypoint).
    pub fn isSectionBoundary(self: *const Waypoint) bool {
        return self.wptType != null;
    }
};

pub const GPXData = struct {
    trace: Trace,
    waypoints: []Waypoint,
    legs: ?[]const LegStats, // wpt-to-wpt legs (available when >= 2 waypoints)
    sections: ?[]const SectionStats, // TimeBarrier-to-TimeBarrier sections with timing (available when >= 2 section boundaries)
    stages: ?[]const StageStats, // LifeBase-to-LifeBase stages (available when >= 2 stage boundaries)
    metadata: Metadata,

    pub fn deinit(self: *GPXData, allocator: std.mem.Allocator) void {
        self.metadata.deinit(allocator);
        self.trace.deinit(allocator);
        for (self.waypoints) |*wpt| {
            wpt.deinit(allocator);
        }
        allocator.free(self.waypoints);
        if (self.legs) |legs| {
            allocator.free(legs);
        }
        if (self.sections) |sections| {
            allocator.free(sections);
        }
        if (self.stages) |stages| {
            allocator.free(stages);
        }
    }
};
