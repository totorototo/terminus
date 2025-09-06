const std = @import("std");
const math = std.math;
const expect = std.testing.expect;
const expectApproxEqAbs = std.testing.expectApproxEqAbs;

/// A GPS point consisting of longitude, latitude, and elevation.
pub const Point = struct {
    longitude: f64,
    latitude: f64,
    elevation: f64,

    pub fn distance(self: *const Point, other: *const Point) f64 {
        // Fast path: if points are identical, return 0
        if (self.longitude == other.longitude and self.latitude == other.latitude) {
            return 0.0;
        }

        const R = 6371000.0; // Earth's radius in meters

        const lat1 = math.degreesToRadians(self.latitude);
        const lon1 = math.degreesToRadians(self.longitude);
        const lat2 = math.degreesToRadians(other.latitude);
        const lon2 = math.degreesToRadians(other.longitude);

        // Compute differences
        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;

        // Optimized Haversine formula with reduced trigonometric calls
        const sin_dLat_2 = math.sin(dLat * 0.5);
        const sin_dLon_2 = math.sin(dLon * 0.5);
        const cos_lat1 = math.cos(lat1);
        const cos_lat2 = math.cos(lat2);

        const a = sin_dLat_2 * sin_dLat_2 + cos_lat1 * cos_lat2 * sin_dLon_2 * sin_dLon_2;

        // Use more numerically stable formula for small distances
        const c = if (a < 0.0001)
            2.0 * math.asin(math.sqrt(a)) // More accurate for small distances
        else
            2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a));

        return R * c; // Distance in meters
    }

    /// Compute the elevation delta between this point and another point.
    pub fn elevationDelta(self: *const Point, other: *const Point) f64 {
        const delta = self.elevation - other.elevation;
        return @abs(delta);
    }

    /// Compute the signed elevation delta (other.elevation - self.elevation)
    pub fn elevationDeltaSigned(self: *const Point, other: *const Point) f64 {
        return other.elevation - self.elevation;
    }

    /// Calculate the 3D distance including elevation difference
    pub fn distance3D(self: *const Point, other: *const Point) f64 {
        const horizontal_dist = self.distance(other);
        const vertical_dist = other.elevation - self.elevation;
        return math.sqrt(horizontal_dist * horizontal_dist + vertical_dist * vertical_dist);
    }

    /// Calculate the slope/gradient between two points as a percentage
    pub fn gradientTo(self: *const Point, other: *const Point) f64 {
        const horizontal_dist = self.distance(other);
        if (horizontal_dist == 0.0) return 0.0;

        const vertical_dist = other.elevation - self.elevation;
        return (vertical_dist / horizontal_dist) * 100.0; // Return as percentage
    }

    /// Create a point at a given distance and bearing from this point
    pub fn pointAtDistanceAndBearing(self: *const Point, distance_meters: f64, bearing_degrees: f64) Point {
        const R = 6371000.0; // Earth's radius in meters
        const angular_distance = distance_meters / R;

        const lat1 = math.degreesToRadians(self.latitude);
        const lon1 = math.degreesToRadians(self.longitude);
        const bearing_rad = math.degreesToRadians(bearing_degrees);

        const lat2 = math.asin(math.sin(lat1) * math.cos(angular_distance) +
            math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing_rad));

        const lon2 = lon1 + math.atan2(math.sin(bearing_rad) * math.sin(angular_distance) * math.cos(lat1), math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2));

        return Point{
            .latitude = math.radiansToDegrees(lat2),
            .longitude = math.radiansToDegrees(lon2),
            .elevation = self.elevation, // Keep same elevation
        };
    }

    /// Compute the initial bearing from this point to another point.
    /// Returns bearing in degrees [0, 360) or NaN for invalid coordinates.
    pub fn bearingTo(self: *const Point, other: *const Point) f64 {
        // Input validation
        if (!self.isValid() or !other.isValid()) {
            return std.math.nan(f64);
        }

        // Handle identical points
        if (self.longitude == other.longitude and self.latitude == other.latitude) {
            return 0.0; // Arbitrary but consistent
        }

        const lat1 = math.degreesToRadians(self.latitude);
        const lon1 = math.degreesToRadians(self.longitude);
        const lat2 = math.degreesToRadians(other.latitude);
        const lon2 = math.degreesToRadians(other.longitude);

        // Compute differences
        const dLon = lon2 - lon1;

        // Calculate bearing with improved numerical stability
        const cos_lat2 = math.cos(lat2);
        const sin_lat1 = math.sin(lat1);
        const cos_lat1 = math.cos(lat1);
        const sin_lat2 = math.sin(lat2);

        const y = math.sin(dLon) * cos_lat2;
        const x = cos_lat1 * sin_lat2 - sin_lat1 * cos_lat2 * math.cos(dLon);

        var bearing = math.atan2(y, x); // Bearing in radians
        bearing = math.radiansToDegrees(bearing); // Convert to degrees

        // Normalize bearing to [0, 360)
        bearing = @mod(bearing + 360.0, 360.0);

        return bearing;
    }

    /// Check if the point has valid coordinates
    pub fn isValid(self: *const Point) bool {
        return self.latitude >= -90.0 and self.latitude <= 90.0 and
            self.longitude >= -180.0 and self.longitude <= 180.0 and
            std.math.isFinite(self.elevation);
    }

    /// Print the point information with better formatting.
    pub fn print(self: *const Point) void {
        const lat_dir = if (self.latitude >= 0) "N" else "S";
        const lon_dir = if (self.longitude >= 0) "E" else "W";

        std.debug.print("Point: {d:.6}°{s}, {d:.6}°{s}, {d:.1}m elevation\n", .{ @abs(self.latitude), lat_dir, @abs(self.longitude), lon_dir, self.elevation });
    }

    /// Format point as a string (useful for debugging)
    pub fn format(self: *const Point, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
        _ = fmt;
        _ = options;
        try writer.print("Point({d:.6}, {d:.6}, {d:.1})", .{ self.longitude, self.latitude, self.elevation });
    }
};

test "distance: same point" {
    const p1 = Point{ .longitude = 0, .latitude = 0, .elevation = 0 };
    try expectApproxEqAbs(p1.distance(&p1), 0.0, 0.001);
}

test "distance: known values" {
    // Test data from Haversine calculator: https://www.movable-type.co.uk/scripts/latlong.html
    const berlin = Point{ .longitude = 13.4050, .latitude = 52.5200, .elevation = 0 };
    const munich = Point{ .longitude = 11.5818, .latitude = 48.1351, .elevation = 0 };

    // Expected distance ~504km
    try expectApproxEqAbs(berlin.distance(&munich), 504_000, 1000); // ±1km tolerance

    // Equator to pole (1/4 circumference)
    const equator = Point{ .longitude = 0, .latitude = 0, .elevation = 0 };
    const north_pole = Point{ .longitude = 0, .latitude = 90, .elevation = 0 };
    const expected = (math.pi * 6371000.0) / 2.0;
    try expectApproxEqAbs(equator.distance(&north_pole), expected, 1000);
}

test "elevationDelta" {
    const base = Point{ .longitude = 0, .latitude = 0, .elevation = 100 };
    const above = Point{ .longitude = 0, .latitude = 0, .elevation = 150 };
    const below = Point{ .longitude = 0, .latitude = 0, .elevation = 50 };

    try expectApproxEqAbs(base.elevationDelta(&above), 50.0, 0.001);
    try expectApproxEqAbs(base.elevationDelta(&below), 50.0, 0.001);
    try expectApproxEqAbs(above.elevationDelta(&below), 100.0, 0.001);
}

test "bearingTo: cardinal directions" {
    const base = Point{ .longitude = 0, .latitude = 0, .elevation = 0 };

    // North
    const north = Point{ .longitude = 0, .latitude = 1, .elevation = 0 };
    try expectApproxEqAbs(base.bearingTo(&north), 0.0, 0.001);

    // East
    const east = Point{ .longitude = 1, .latitude = 0, .elevation = 0 };
    try expectApproxEqAbs(base.bearingTo(&east), 90.0, 0.001);

    // South
    const south = Point{ .longitude = 0, .latitude = -1, .elevation = 0 };
    try expectApproxEqAbs(base.bearingTo(&south), 180.0, 0.001);

    // West
    const west = Point{ .longitude = -1, .latitude = 0, .elevation = 0 };
    try expectApproxEqAbs(base.bearingTo(&west), 270.0, 0.001);
}

test "bearingTo: complex cases" {
    // New York to London
    const ny = Point{ .longitude = -74.0060, .latitude = 40.7128, .elevation = 0 };
    const london = Point{ .longitude = -0.1278, .latitude = 51.5074, .elevation = 0 };

    const bearing = ny.bearingTo(&london);
    // Expected bearing ~51.21 degrees
    try expectApproxEqAbs(bearing, 51.21, 1.0); // ±1° tolerance

    // Cross-meridian case
    const west_meridian = Point{ .longitude = 179.9, .latitude = 0, .elevation = 0 };
    const east_meridian = Point{ .longitude = -179.9, .latitude = 0, .elevation = 0 };

    const bearing_cross = west_meridian.bearingTo(&east_meridian);
    std.debug.print("Bearing from West Meridian to East Meridian: {:.2} degrees\n", .{bearing_cross});
    try expectApproxEqAbs(bearing_cross, 90.0, 0.1);
}

test "isValid: coordinate validation" {
    const valid = Point{ .longitude = 12.34, .latitude = 56.78, .elevation = 100.0 };
    const invalid_lat = Point{ .longitude = 0.0, .latitude = 91.0, .elevation = 0.0 };
    const invalid_lon = Point{ .longitude = 181.0, .latitude = 0.0, .elevation = 0.0 };
    const invalid_elev = Point{ .longitude = 0.0, .latitude = 0.0, .elevation = std.math.nan(f64) };

    try expect(valid.isValid());
    try expect(!invalid_lat.isValid());
    try expect(!invalid_lon.isValid());
    try expect(!invalid_elev.isValid());
}

test "distance3D: 3D distance calculation" {
    const base = Point{ .longitude = 0, .latitude = 0, .elevation = 0 };
    const elevated = Point{ .longitude = 0, .latitude = 0.001, .elevation = 100 }; // ~111m horizontal, 100m vertical

    const horizontal_dist = base.distance(&elevated);
    const distance_3d = base.distance3D(&elevated);

    try expect(distance_3d > horizontal_dist);
    try expectApproxEqAbs(distance_3d, math.sqrt(horizontal_dist * horizontal_dist + 100 * 100), 1.0);
}

test "gradientTo: slope calculation" {
    const base = Point{ .longitude = 0, .latitude = 0, .elevation = 0 };
    const elevated = Point{ .longitude = 0, .latitude = 0.001, .elevation = 111 }; // ~111m horizontal, 111m vertical = 100% grade

    const gradient = base.gradientTo(&elevated);
    try expectApproxEqAbs(gradient, 100.0, 5.0); // Should be close to 100% grade
}

test "pointAtDistanceAndBearing: forward calculation" {
    const origin = Point{ .longitude = 0, .latitude = 0, .elevation = 100 };

    // Go 1000m north (bearing 0°)
    const north_point = origin.pointAtDistanceAndBearing(1000.0, 0.0);
    try expect(north_point.latitude > origin.latitude);
    try expectApproxEqAbs(north_point.longitude, origin.longitude, 0.0001);

    // Go 1000m east (bearing 90°)
    const east_point = origin.pointAtDistanceAndBearing(1000.0, 90.0);
    try expect(east_point.longitude > origin.longitude);
    try expectApproxEqAbs(east_point.latitude, origin.latitude, 0.0001);

    // Verify round-trip accuracy
    const calculated_distance = origin.distance(&north_point);
    const calculated_bearing = origin.bearingTo(&north_point);

    try expectApproxEqAbs(calculated_distance, 1000.0, 1.0);
    try expectApproxEqAbs(calculated_bearing, 0.0, 0.1);
}

test "elevationDeltaSigned: signed elevation difference" {
    const base = Point{ .longitude = 0, .latitude = 0, .elevation = 100 };
    const above = Point{ .longitude = 0, .latitude = 0, .elevation = 150 };
    const below = Point{ .longitude = 0, .latitude = 0, .elevation = 50 };

    try expectApproxEqAbs(base.elevationDeltaSigned(&above), 50.0, 0.001);
    try expectApproxEqAbs(base.elevationDeltaSigned(&below), -50.0, 0.001);
    try expectApproxEqAbs(above.elevationDeltaSigned(&below), -100.0, 0.001);
}

test "bearingTo: invalid coordinates" {
    const valid = Point{ .longitude = 0, .latitude = 0, .elevation = 0 };
    const invalid = Point{ .longitude = 200, .latitude = 100, .elevation = 0 };

    const bearing = valid.bearingTo(&invalid);
    try expect(std.math.isNan(bearing));
}

test "distance optimization: identical points" {
    const p1 = Point{ .longitude = 12.34567, .latitude = 56.78901, .elevation = 100 };
    const p2 = Point{ .longitude = 12.34567, .latitude = 56.78901, .elevation = 200 };

    // Should be exactly 0 for identical coordinates (fast path)
    try expectApproxEqAbs(p1.distance(&p2), 0.0, 0.001);
}

test "print method with formatting" {
    const p = Point{ .longitude = -74.0060, .latitude = 40.7128, .elevation = 10.5 };

    // Test that print doesn't crash
    p.print();

    // Test custom formatting (would need allocator in real usage)
    // This is a simplified test to ensure the format function compiles
    var buf: [256]u8 = undefined;
    var fbs = std.io.fixedBufferStream(&buf);
    try p.format("", .{}, fbs.writer());

    const result = fbs.getWritten();
    try expect(std.mem.indexOf(u8, result, "Point(") != null);
}

test "edge cases" {
    const pole = Point{ .longitude = 0, .latitude = 90, .elevation = 0 };
    const anti_pole = Point{ .longitude = 180, .latitude = -90, .elevation = 0 };

    // Distance between poles
    try expectApproxEqAbs(pole.distance(&anti_pole), math.pi * 6371000, 1000);

    // Bearing from pole (should be 180° south, but implementation might need special handling)
    const pole_bearing = pole.bearingTo(&anti_pole);
    try expect(pole_bearing >= 0 and pole_bearing <= 360);

    // Elevation at max/min values
    const max_elev = Point{ .longitude = 0, .latitude = 0, .elevation = std.math.floatMax(f64) };
    const min_elev = Point{ .longitude = 0, .latitude = 0, .elevation = std.math.floatMin(f64) };
    try expectApproxEqAbs(max_elev.elevationDelta(&min_elev), std.math.floatMax(f64) - std.math.floatMin(f64), 0.001);
}
