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

test "Waypoint.isStageBoundary: Start, LifeBase, Arrival return true" {
    const wpt_start = Waypoint{ .lat = 0, .lon = 0, .name = "S", .wptType = "Start", .time = null };
    const wpt_lb = Waypoint{ .lat = 0, .lon = 0, .name = "L", .wptType = "LifeBase", .time = null };
    const wpt_arr = Waypoint{ .lat = 0, .lon = 0, .name = "A", .wptType = "Arrival", .time = null };
    try std.testing.expect(wpt_start.isStageBoundary());
    try std.testing.expect(wpt_lb.isStageBoundary());
    try std.testing.expect(wpt_arr.isStageBoundary());
}

test "Waypoint.isStageBoundary: TimeBarrier returns false" {
    const wpt = Waypoint{ .lat = 0, .lon = 0, .name = "T", .wptType = "TimeBarrier", .time = null };
    try std.testing.expect(!wpt.isStageBoundary());
}

test "Waypoint.isStageBoundary: null wptType returns false" {
    const wpt = Waypoint{ .lat = 0, .lon = 0, .name = "P", .wptType = null, .time = null };
    try std.testing.expect(!wpt.isStageBoundary());
}

test "Waypoint.isSectionBoundary: any non-null wptType returns true" {
    const wpt_tb = Waypoint{ .lat = 0, .lon = 0, .name = "T", .wptType = "TimeBarrier", .time = null };
    const wpt_start = Waypoint{ .lat = 0, .lon = 0, .name = "S", .wptType = "Start", .time = null };
    try std.testing.expect(wpt_tb.isSectionBoundary());
    try std.testing.expect(wpt_start.isSectionBoundary());
}

test "Waypoint.isSectionBoundary: null wptType returns false" {
    const wpt = Waypoint{ .lat = 0, .lon = 0, .name = "P", .wptType = null, .time = null };
    try std.testing.expect(!wpt.isSectionBoundary());
}

test "Metadata.deinit: frees owned name and description" {
    const allocator = std.testing.allocator;
    var meta = Metadata{
        .name = try allocator.dupe(u8, "Trail Name"),
        .description = try allocator.dupe(u8, "A description"),
    };
    meta.deinit(allocator);
}

test "Metadata.deinit: handles null fields without crash" {
    const allocator = std.testing.allocator;
    var meta = Metadata{ .name = null, .description = null };
    meta.deinit(allocator);
}

test "Waypoint.deinit: frees all optional strings" {
    const allocator = std.testing.allocator;
    var wpt = Waypoint{
        .lat = 48.85,
        .lon = 2.35,
        .name = try allocator.dupe(u8, "Checkpoint 1"),
        .desc = try allocator.dupe(u8, "A checkpoint"),
        .cmt = try allocator.dupe(u8, "some comment"),
        .sym = try allocator.dupe(u8, "Flag"),
        .wptType = try allocator.dupe(u8, "TimeBarrier"),
        .time = 1_700_000_000,
    };
    wpt.deinit(allocator);
}

test "Waypoint.deinit: handles null optional fields" {
    const allocator = std.testing.allocator;
    var wpt = Waypoint{
        .lat = 0,
        .lon = 0,
        .name = try allocator.dupe(u8, "Plain"),
        .time = null,
    };
    wpt.deinit(allocator);
}

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
