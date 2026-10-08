//! Zigar hook: the modules terminus.zig imports when Zigar builds it to WASM. Zigar copies
//! build.zig.zon next to its own build.zig, so `b.dependency` resolves the same pinned
//! package as `zig build test`.

const std = @import("std");

pub fn getImports(b: *std.Build, args: anytype) []const std.Build.Module.Import {
    const options = .{ .target = args.target, .optimize = args.optimize };
    return b.allocator.dupe(std.Build.Module.Import, &.{
        .{ .name = "gpxz", .module = b.dependency("gpxz", options).module("gpxz") },
    }) catch @panic("OOM");
}
