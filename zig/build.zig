//! Native build: `zig build test` runs terminus.zig's tests against gpxz.
//!
//! Zigar does not use this file (the Vite plugin runs with `ignoreBuildFile: true`); it builds
//! the WASM module with its own build.zig and takes the imports from build.extra.zig. Both
//! read the dependency from build.zig.zon.

const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const dependency_options = .{ .target = target, .optimize = optimize };

    const terminus = b.createModule(.{
        .root_source_file = b.path("terminus.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "gpxz", .module = b.dependency("gpxz", dependency_options).module("gpxz") },
        },
    });

    const tests = b.addTest(.{ .root_module = terminus });
    const test_step = b.step("test", "Run terminus's Zig tests");
    test_step.dependOn(&b.addRunArtifact(tests).step);
}
