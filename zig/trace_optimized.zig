const std = @import("std");
const distance = @import("gpspoint.zig").distance;

// Optimized trace implementation targeting JS-WASM performance
// Key optimizations:
// 1. Single contiguous memory layout for better cache performance
// 2. Batch operations to minimize JS-WASM boundary crossings
// 3. Pre-allocated result buffers to avoid repeated allocations
// 4. Vectorized operations where possible
// 5. Smart indexing strategies for common access patterns

pub const OptimizedTrace = struct {
    // Single contiguous memory block containing all data
    // Layout: [point0_lat, point0_lon, point0_alt, cum_dist0, cum_elev0, cum_elev_loss0, point1_lat, ...]
    // This improves cache locality significantly
    data_buffer: []f64,
    point_count: usize,

    // Pre-allocated working buffers to avoid repeated allocations
    search_cache: []usize, // Cache recent search results
    result_buffer: []f64, // Reusable buffer for batch results

    // Performance counters (can be removed in production)
    cache_hits: u32 = 0,
    cache_misses: u32 = 0,

    const POINT_STRIDE = 6; // lat, lon, alt, cum_dist, cum_elev, cum_elev_loss per point
    const CACHE_SIZE = 32; // Size of search cache

    pub fn init(allocator: std.mem.Allocator, points: []const [3]f64) !OptimizedTrace {
        if (points.len == 0) {
            return OptimizedTrace{
                .data_buffer = &.{},
                .point_count = 0,
                .search_cache = &.{},
                .result_buffer = &.{},
            };
        }

        // Allocate single contiguous buffer for all data
        const buffer_size = points.len * POINT_STRIDE;
        const data_buffer = try allocator.alloc(f64, buffer_size);

        // Allocate working buffers
        const search_cache = try allocator.alloc(usize, CACHE_SIZE);
        const result_buffer = try allocator.alloc(f64, points.len * 3); // Max possible result size

        errdefer {
            allocator.free(data_buffer);
            allocator.free(search_cache);
            allocator.free(result_buffer);
        }

        // Initialize cache
        @memset(search_cache, std.math.maxInt(usize));

        // Populate data buffer with interleaved layout
        var cum_dist: f64 = 0.0;
        var cum_elev: f64 = 0.0;
        var cum_elev_loss: f64 = 0.0;

        for (0..points.len) |i| {
            const base_idx = i * POINT_STRIDE;

            // Copy point data
            data_buffer[base_idx + 0] = points[i][0]; // lat
            data_buffer[base_idx + 1] = points[i][1]; // lon
            data_buffer[base_idx + 2] = points[i][2]; // alt

            // Calculate cumulative values
            if (i > 0) {
                const prev_point = [3]f64{
                    data_buffer[(i - 1) * POINT_STRIDE + 0],
                    data_buffer[(i - 1) * POINT_STRIDE + 1],
                    data_buffer[(i - 1) * POINT_STRIDE + 2],
                };
                const curr_point = points[i];

                cum_dist += distance(prev_point, curr_point);

                const elev_delta = curr_point[2] - prev_point[2];
                if (elev_delta > 0) {
                    cum_elev += elev_delta;
                } else if (elev_delta < 0) {
                    cum_elev_loss += -elev_delta; // Convert negative to positive for loss
                }
            }

            data_buffer[base_idx + 3] = cum_dist; // cumulative distance
            data_buffer[base_idx + 4] = cum_elev; // cumulative elevation gain
            data_buffer[base_idx + 5] = cum_elev_loss; // cumulative elevation loss
        }

        return OptimizedTrace{
            .data_buffer = data_buffer,
            .point_count = points.len,
            .search_cache = search_cache,
            .result_buffer = result_buffer,
        };
    }

    pub fn deinit(self: *OptimizedTrace, allocator: std.mem.Allocator) void {
        if (self.data_buffer.len > 0) allocator.free(self.data_buffer);
        if (self.search_cache.len > 0) allocator.free(self.search_cache);
        if (self.result_buffer.len > 0) allocator.free(self.result_buffer);
    }

    // Fast inline accessors for common operations
    pub inline fn totalDistance(self: *const OptimizedTrace) f64 {
        if (self.point_count == 0) return 0.0;
        return self.data_buffer[(self.point_count - 1) * POINT_STRIDE + 3];
    }

    pub inline fn totalElevation(self: *const OptimizedTrace) f64 {
        if (self.point_count == 0) return 0.0;
        return self.data_buffer[(self.point_count - 1) * POINT_STRIDE + 4];
    }

    pub inline fn totalElevationLoss(self: *const OptimizedTrace) f64 {
        if (self.point_count == 0) return 0.0;
        return self.data_buffer[(self.point_count - 1) * POINT_STRIDE + 5];
    }

    // Optimized binary search with caching
    fn findIndexAtDistanceCached(self: *OptimizedTrace, target_meters: f64) usize {
        if (self.point_count == 0) return 0;

        // Check cache for recent searches
        const cache_key = @as(usize, @intFromFloat(@mod(target_meters, CACHE_SIZE)));
        if (self.search_cache[cache_key] != std.math.maxInt(usize)) {
            const cached_idx = self.search_cache[cache_key];
            if (cached_idx < self.point_count) {
                const cached_dist = self.data_buffer[cached_idx * POINT_STRIDE + 3];
                // Check if cache hit is still valid (within reasonable range)
                if (@abs(cached_dist - target_meters) < 1000.0) { // 1km tolerance
                    self.cache_hits += 1;
                    return cached_idx;
                }
            }
        }

        self.cache_misses += 1;

        // Optimized binary search
        var low: usize = 0;
        var high: usize = self.point_count;

        while (low < high) {
            const mid = low + (high - low) / 2;
            const mid_dist = self.data_buffer[mid * POINT_STRIDE + 3];

            if (mid_dist < target_meters) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        const result = @min(low, self.point_count - 1);

        // Cache the result
        self.search_cache[cache_key] = result;

        return result;
    }

    // Single point lookup - optimized for JS calls
    pub fn pointAtDistance(self: *OptimizedTrace, target_km: f64) ?[3]f64 {
        if (target_km < 0 or self.point_count == 0) return null;

        const target_meters = target_km * 1000.0;
        const idx = self.findIndexAtDistanceCached(target_meters);

        if (idx >= self.point_count) return null;

        const base = idx * POINT_STRIDE;
        return [3]f64{
            self.data_buffer[base + 0], // lat
            self.data_buffer[base + 1], // lon
            self.data_buffer[base + 2], // alt
        };
    }

    // BATCH OPERATIONS - Key optimization for JS-WASM performance
    // Instead of multiple single calls, batch operations reduce boundary crossings

    // Batch point lookup - single call returns multiple points
    pub fn pointsAtDistances(self: *OptimizedTrace, distances_km: []const f64, result_points: [][3]f64) usize {
        if (distances_km.len == 0 or self.point_count == 0) return 0;

        var count: usize = 0;
        for (distances_km, 0..) |dist_km, i| {
            if (i >= result_points.len) break;
            if (dist_km < 0) continue;

            const target_meters = dist_km * 1000.0;
            const idx = self.findIndexAtDistanceCached(target_meters);

            if (idx < self.point_count) {
                const base = idx * POINT_STRIDE;
                result_points[count] = [3]f64{
                    self.data_buffer[base + 0],
                    self.data_buffer[base + 1],
                    self.data_buffer[base + 2],
                };
                count += 1;
            }
        }

        return count;
    }

    // Batch range query - returns all points in distance range efficiently
    pub fn pointsInRange(self: *OptimizedTrace, start_km: f64, end_km: f64, max_points: usize) []const [3]f64 {
        if (start_km < 0 or end_km < start_km or self.point_count == 0 or max_points == 0) {
            return &.{};
        }

        const start_meters = start_km * 1000.0;
        const end_meters = end_km * 1000.0;

        const start_idx = self.findIndexAtDistanceCached(start_meters);
        const end_idx = self.findIndexAtDistanceCached(end_meters);

        if (start_idx >= self.point_count or start_idx > end_idx) return &.{};

        // Calculate how many points we can return
        const actual_end_idx = @min(end_idx + 1, self.point_count);
        const point_count = actual_end_idx - start_idx;
        const return_count = @min(point_count, max_points);

        // Use result buffer to prepare contiguous result
        for (0..return_count) |i| {
            const src_idx = start_idx + i;
            const base = src_idx * POINT_STRIDE;
            const dst_base = i * 3;

            self.result_buffer[dst_base + 0] = self.data_buffer[base + 0]; // lat
            self.result_buffer[dst_base + 1] = self.data_buffer[base + 1]; // lon
            self.result_buffer[dst_base + 2] = self.data_buffer[base + 2]; // alt
        }

        // Return slice view of result buffer
        const result_slice = std.mem.bytesAsSlice([3]f64, std.mem.sliceAsBytes(self.result_buffer[0 .. return_count * 3]));
        return result_slice[0..return_count];
    }

    // High-performance sampling - get N evenly spaced points
    pub fn samplePoints(self: *OptimizedTrace, sample_count: usize, result_points: [][3]f64) usize {
        if (sample_count == 0 or self.point_count == 0 or result_points.len == 0) return 0;

        const actual_count = @min(sample_count, @min(self.point_count, result_points.len));

        if (actual_count == 1) {
            // Return first point
            const base = 0;
            result_points[0] = [3]f64{
                self.data_buffer[base + 0],
                self.data_buffer[base + 1],
                self.data_buffer[base + 2],
            };
            return 1;
        }

        // Calculate step size for even distribution
        const step = @as(f64, @floatFromInt(self.point_count - 1)) / @as(f64, @floatFromInt(actual_count - 1));

        for (0..actual_count) |i| {
            const float_idx = @as(f64, @floatFromInt(i)) * step;
            const idx = @as(usize, @intFromFloat(@round(float_idx)));
            const safe_idx = @min(idx, self.point_count - 1);

            const base = safe_idx * POINT_STRIDE;
            result_points[i] = [3]f64{
                self.data_buffer[base + 0],
                self.data_buffer[base + 1],
                self.data_buffer[base + 2],
            };
        }

        return actual_count;
    }

    // Performance statistics for optimization analysis
    pub fn getCacheStats(self: *const OptimizedTrace) struct { hits: u32, misses: u32, ratio: f64 } {
        const total = self.cache_hits + self.cache_misses;
        const ratio = if (total > 0) @as(f64, @floatFromInt(self.cache_hits)) / @as(f64, @floatFromInt(total)) else 0.0;

        return .{
            .hits = self.cache_hits,
            .misses = self.cache_misses,
            .ratio = ratio,
        };
    }

    // Clear cache and reset stats
    pub fn resetCache(self: *OptimizedTrace) void {
        @memset(self.search_cache, std.math.maxInt(usize));
        self.cache_hits = 0;
        self.cache_misses = 0;
    }

    // Memory-efficient slice operation that reuses internal buffer
    pub fn sliceBetweenDistances(self: *OptimizedTrace, start_km: f64, end_km: f64) ?[]const [3]f64 {
        return self.pointsInRange(start_km, end_km, self.point_count);
    }

    // Bulk statistics calculation - single call for all common metrics
    pub fn getStats(self: *const OptimizedTrace) struct {
        total_distance_km: f64,
        total_elevation_m: f64,
        total_elevation_loss_m: f64,
        point_count: usize,
        avg_speed_kmh: ?f64, // If we have time data
        max_elevation: f64,
        min_elevation: f64,
    } {
        if (self.point_count == 0) {
            return .{
                .total_distance_km = 0.0,
                .total_elevation_m = 0.0,
                .total_elevation_loss_m = 0.0,
                .point_count = 0,
                .avg_speed_kmh = null,
                .max_elevation = 0.0,
                .min_elevation = 0.0,
            };
        }

        var max_elev = self.data_buffer[2]; // First point altitude
        var min_elev = self.data_buffer[2];

        // Single pass through data for min/max elevation
        var i: usize = 1;
        while (i < self.point_count) : (i += 1) {
            const elev = self.data_buffer[i * POINT_STRIDE + 2];
            max_elev = @max(max_elev, elev);
            min_elev = @min(min_elev, elev);
        }

        return .{
            .total_distance_km = self.totalDistance() / 1000.0,
            .total_elevation_m = self.totalElevation(),
            .total_elevation_loss_m = self.totalElevationLoss(),
            .point_count = self.point_count,
            .avg_speed_kmh = null, // Could calculate if time data available
            .max_elevation = max_elev,
            .min_elevation = min_elev,
        };
    }
};

// Tests to verify the optimized implementation works correctly
const testing = std.testing;
const expect = testing.expect;
const expectApproxEqAbs = testing.expectApproxEqAbs;

test "OptimizedTrace: basic functionality" {
    const allocator = testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 100.0 },
        [3]f64{ 0.0, 0.001, 105.0 }, // ~111m north, +5m elevation
        [3]f64{ 0.0, 0.002, 110.0 }, // ~222m total, +5m elevation
    };

    var trace = try OptimizedTrace.init(allocator, &points);
    defer trace.deinit(allocator);

    // Test basic properties
    try expectApproxEqAbs(trace.totalDistance(), 222.0, 5.0);
    try expectApproxEqAbs(trace.totalElevation(), 10.0, 0.001);
    try expectApproxEqAbs(trace.totalElevationLoss(), 0.0, 0.001);
    try expect(trace.point_count == 3);
}

test "OptimizedTrace: batch operations" {
    const allocator = testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 0.0, 0.0, 0.0 },
        [3]f64{ 0.0, 0.001, 0.0 },
        [3]f64{ 0.0, 0.002, 0.0 },
        [3]f64{ 0.0, 0.003, 0.0 },
        [3]f64{ 0.0, 0.004, 0.0 },
    };

    var trace = try OptimizedTrace.init(allocator, &points);
    defer trace.deinit(allocator);

    // Test batch point lookup
    const distances = [_]f64{ 0.0, 0.111, 0.222 };
    var result_points: [3][3]f64 = undefined;
    const count = trace.pointsAtDistances(&distances, &result_points);

    try expect(count == 3);
    try expectApproxEqAbs(result_points[0][1], 0.0, 0.001);

    // Test range query
    const range_points = trace.pointsInRange(0.0, 0.2, 5);
    try expect(range_points.len > 0);

    // Test sampling
    var sample_points: [3][3]f64 = undefined;
    const sample_count = trace.samplePoints(3, &sample_points);
    try expect(sample_count == 3);
}

test "OptimizedTrace: performance and caching" {
    const allocator = testing.allocator;

    // Create larger dataset for performance testing
    var points = try allocator.alloc([3]f64, 100);
    defer allocator.free(points);

    for (0..points.len) |i| {
        const lat = @as(f64, @floatFromInt(i)) * 0.001;
        points[i] = [3]f64{ 0.0, lat, @as(f64, @floatFromInt(i * 10)) };
    }

    var trace = try OptimizedTrace.init(allocator, points);
    defer trace.deinit(allocator);

    // Test multiple searches to trigger caching
    _ = trace.pointAtDistance(10.0);
    _ = trace.pointAtDistance(10.0); // Should hit cache
    _ = trace.pointAtDistance(20.0);
    _ = trace.pointAtDistance(10.0); // Should hit cache again

    const stats = trace.getCacheStats();
    try expect(stats.hits > 0); // Should have some cache hits

    // Test bulk stats
    const bulk_stats = trace.getStats();
    try expect(bulk_stats.point_count == 100);
    try expect(bulk_stats.total_distance_km > 0);
    try expect(bulk_stats.total_elevation_loss_m >= 0);
}

test "OptimizedTrace: memory layout verification" {
    const allocator = testing.allocator;

    const points = [_][3]f64{
        [3]f64{ 1.0, 2.0, 3.0 },
        [3]f64{ 4.0, 5.0, 6.0 },
    };

    var trace = try OptimizedTrace.init(allocator, &points);
    defer trace.deinit(allocator);

    // Verify memory layout: [lat0, lon0, alt0, cum_dist0, cum_elev0, cum_elev_loss0, lat1, lon1, alt1, cum_dist1, cum_elev1, cum_elev_loss1]
    try expect(trace.data_buffer[0] == 1.0); // lat0
    try expect(trace.data_buffer[1] == 2.0); // lon0
    try expect(trace.data_buffer[2] == 3.0); // alt0
    try expect(trace.data_buffer[3] == 0.0); // cum_dist0
    try expect(trace.data_buffer[4] == 0.0); // cum_elev0
    try expect(trace.data_buffer[5] == 0.0); // cum_elev_loss0

    try expect(trace.data_buffer[6] == 4.0); // lat1
    try expect(trace.data_buffer[7] == 5.0); // lon1
    try expect(trace.data_buffer[8] == 6.0); // alt1
    // cum_dist1, cum_elev1, and cum_elev_loss1 should be calculated values
    try expect(trace.data_buffer[9] > 0.0); // cum_dist1 should be > 0
}
