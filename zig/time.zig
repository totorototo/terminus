const std = @import("std");

fn parseInt(comptime T: type, s: []const u8) !T {
    return try std.fmt.parseInt(T, s, 10);
}

fn dateTimeToUnixSeconds(year: i32, month: i32, day: i32, hour: i32, minute: i32, second: i32) i64 {
    // Convert civil date/time (UTC) to Unix timestamp
    // Using proleptic Gregorian calendar formula

    var y: i64 = year;
    var m: i64 = month;
    if (m <= 2) {
        y -= 1;
        m += 12;
    }

    const days = 365 * y + @divFloor(y, 4) - @divFloor(y, 100) + @divFloor(y, 400) + @divFloor((153 * m - 457), 5) + day - 719469;

    return days * 86400 + @as(i64, hour) * 3600 + @as(i64, minute) * 60 + @as(i64, second);
}

/// Parse timezone offset like "+01:00", "-05:00", "Z"
fn parseTimezoneOffset(s: []const u8) !i64 {
    if (s.len == 1 and s[0] == 'Z') {
        return 0; // UTC
    }

    if (s.len != 6) return error.InvalidTimezone;

    const sign: i64 = if (s[0] == '+') 1 else if (s[0] == '-') -1 else return error.InvalidTimezone;

    if (s[3] != ':') return error.InvalidTimezone;

    const hours = try parseInt(i32, s[1..3]);
    const minutes = try parseInt(i32, s[4..6]);

    // Return offset in seconds (note: we subtract because +01:00 means we're ahead of UTC)
    return -sign * (@as(i64, hours) * 3600 + @as(i64, minutes) * 60);
}

/// Parse ISO 8601 date with timezone support
/// Formats supported:
///   - 2025-11-20T12:00:00Z (UTC)
///   - 2025-11-20T12:00:00+01:00 (CET)
///   - 2025-11-20T12:00:00-05:00 (EST)
pub fn parseIso8601ToEpoch(s: []const u8) !i64 {
    // Minimum: YYYY-MM-DDTHH:MM:SSZ (20 chars)
    // Maximum: YYYY-MM-DDTHH:MM:SS+HH:MM (25 chars)
    if (s.len < 20 or s.len > 25) return error.InvalidFormat;

    if (s[4] != '-' or s[7] != '-' or s[10] != 'T' or
        s[13] != ':' or s[16] != ':') return error.InvalidFormat;

    const year = try parseInt(i32, s[0..4]);
    const month = try parseInt(i32, s[5..7]);
    const day = try parseInt(i32, s[8..10]);
    const hour = try parseInt(i32, s[11..13]);
    const minute = try parseInt(i32, s[14..16]);
    const second = try parseInt(i32, s[17..19]);

    const timestamp = dateTimeToUnixSeconds(year, month, day, hour, minute, second);

    // Parse timezone
    const tz_offset = try parseTimezoneOffset(s[19..]);

    return timestamp + tz_offset;
}

/// Common timezone offsets (winter time, without DST)
pub const Timezone = enum {
    UTC, // +00:00
    CET, // +01:00 (Central European Time)
    CEST, // +02:00 (Central European Summer Time)
    EST, // -05:00 (Eastern Standard Time)
    EDT, // -04:00 (Eastern Daylight Time)
    PST, // -08:00 (Pacific Standard Time)
    PDT, // -07:00 (Pacific Daylight Time)

    pub fn toOffset(self: Timezone) i64 {
        return switch (self) {
            .UTC => 0,
            .CET => 3600,
            .CEST => 7200,
            .EST => -18000,
            .EDT => -14400,
            .PST => -28800,
            .PDT => -25200,
        };
    }

    pub fn toString(self: Timezone) []const u8 {
        return switch (self) {
            .UTC => "+00:00",
            .CET => "+01:00",
            .CEST => "+02:00",
            .EST => "-05:00",
            .EDT => "-04:00",
            .PST => "-08:00",
            .PDT => "-07:00",
        };
    }
};

// Tests

const testing = std.testing;
const expectEqual = testing.expectEqual;
const expectError = testing.expectError;

test "parseIso8601ToEpoch: UTC format" {
    const result = try parseIso8601ToEpoch("2025-11-20T12:00:00Z");
    try expectEqual(@as(i64, 1763640000), result);
}

test "parseIso8601ToEpoch: Unix epoch" {
    const result = try parseIso8601ToEpoch("1970-01-01T00:00:00Z");
    try expectEqual(@as(i64, 0), result);
}

test "parseIso8601ToEpoch: positive timezone offset" {
    const utc = try parseIso8601ToEpoch("2025-11-20T12:00:00Z");
    const cet = try parseIso8601ToEpoch("2025-11-20T12:00:00+01:00");

    // 12:00 CET = 11:00 UTC, so CET timestamp should be 1 hour earlier
    try expectEqual(utc - 3600, cet);
}

test "parseIso8601ToEpoch: negative timezone offset" {
    const utc = try parseIso8601ToEpoch("2025-11-20T12:00:00Z");
    const est = try parseIso8601ToEpoch("2025-11-20T12:00:00-05:00");

    // 12:00 EST = 17:00 UTC, so EST timestamp should be 5 hours later
    try expectEqual(utc + 18000, est);
}

test "parseIso8601ToEpoch: various timezone offsets" {
    const utc = try parseIso8601ToEpoch("2025-11-20T12:00:00Z");
    const plus_0530 = try parseIso8601ToEpoch("2025-11-20T12:00:00+05:30");
    const minus_0800 = try parseIso8601ToEpoch("2025-11-20T12:00:00-08:00");

    try expectEqual(utc - (5 * 3600 + 30 * 60), plus_0530);
    try expectEqual(utc + (8 * 3600), minus_0800);
}

test "parseIso8601ToEpoch: invalid format - too short" {
    try expectError(error.InvalidFormat, parseIso8601ToEpoch("2025-11-20T12:00"));
}

test "parseIso8601ToEpoch: invalid format - too long" {
    try expectError(error.InvalidFormat, parseIso8601ToEpoch("2025-11-20T12:00:00+01:00:00"));
}

test "parseIso8601ToEpoch: invalid format - missing T" {
    try expectError(error.InvalidFormat, parseIso8601ToEpoch("2025-11-20 12:00:00Z"));
}

test "parseIso8601ToEpoch: invalid format - missing dashes" {
    try expectError(error.InvalidFormat, parseIso8601ToEpoch("20251120T12:00:00Z"));
}

test "parseIso8601ToEpoch: invalid format - missing colons" {
    try expectError(error.InvalidFormat, parseIso8601ToEpoch("2025-11-20T120000Z"));
}

test "parseTimezoneOffset: UTC (Z)" {
    const offset = try parseTimezoneOffset("Z");
    try expectEqual(@as(i64, 0), offset);
}

test "parseTimezoneOffset: positive offset" {
    const offset = try parseTimezoneOffset("+01:00");
    try expectEqual(@as(i64, -3600), offset);
}

test "parseTimezoneOffset: negative offset" {
    const offset = try parseTimezoneOffset("-05:00");
    try expectEqual(@as(i64, 18000), offset);
}

test "parseTimezoneOffset: invalid - no colon" {
    try expectError(error.InvalidTimezone, parseTimezoneOffset("+0100"));
}

test "parseTimezoneOffset: invalid - wrong length" {
    try expectError(error.InvalidTimezone, parseTimezoneOffset("+1:00"));
}

test "parseTimezoneOffset: invalid - wrong sign" {
    try expectError(error.InvalidTimezone, parseTimezoneOffset("*01:00"));
}

test "dateTimeToUnixSeconds: Unix epoch" {
    const result = dateTimeToUnixSeconds(1970, 1, 1, 0, 0, 0);
    try expectEqual(@as(i64, 0), result);
}

test "dateTimeToUnixSeconds: year 2000" {
    const result = dateTimeToUnixSeconds(2000, 1, 1, 0, 0, 0);
    try expectEqual(@as(i64, 946684800), result);
}

test "dateTimeToUnixSeconds: leap year (2024-02-29)" {
    const result = dateTimeToUnixSeconds(2024, 2, 29, 0, 0, 0);
    // 2024-02-29 is a valid date (leap year)
    try expectEqual(@as(i64, 1709164800), result);
}

test "dateTimeToUnixSeconds: end of year" {
    const result = dateTimeToUnixSeconds(2025, 12, 31, 23, 59, 59);
    try expectEqual(@as(i64, 1767225599), result);
}

test "Timezone.toOffset: all timezones" {
    try expectEqual(@as(i64, 0), Timezone.UTC.toOffset());
    try expectEqual(@as(i64, 3600), Timezone.CET.toOffset());
    try expectEqual(@as(i64, 7200), Timezone.CEST.toOffset());
    try expectEqual(@as(i64, -18000), Timezone.EST.toOffset());
    try expectEqual(@as(i64, -14400), Timezone.EDT.toOffset());
    try expectEqual(@as(i64, -28800), Timezone.PST.toOffset());
    try expectEqual(@as(i64, -25200), Timezone.PDT.toOffset());
}

test "Timezone.toString: all timezones" {
    try testing.expectEqualStrings("+00:00", Timezone.UTC.toString());
    try testing.expectEqualStrings("+01:00", Timezone.CET.toString());
    try testing.expectEqualStrings("+02:00", Timezone.CEST.toString());
    try testing.expectEqualStrings("-05:00", Timezone.EST.toString());
    try testing.expectEqualStrings("-04:00", Timezone.EDT.toString());
    try testing.expectEqualStrings("-08:00", Timezone.PST.toString());
    try testing.expectEqualStrings("-07:00", Timezone.PDT.toString());
}

test "parseIso8601ToEpoch: same moment in different timezones" {
    // All these represent the same moment in time
    const utc = try parseIso8601ToEpoch("2025-11-20T12:00:00Z");
    const cet = try parseIso8601ToEpoch("2025-11-20T13:00:00+01:00");
    const est = try parseIso8601ToEpoch("2025-11-20T07:00:00-05:00");

    try expectEqual(utc, cet);
    try expectEqual(utc, est);
}

pub fn main() void {
    // Test UTC
    const epoch_utc = parseIso8601ToEpoch("2025-11-20T12:00:00Z") catch {
        std.debug.print("Invalid date format\n", .{});
        return;
    };
    std.debug.print("UTC:  2025-11-20T12:00:00Z -> {}\n", .{epoch_utc});

    // Test CET (+01:00)
    const epoch_cet = parseIso8601ToEpoch("2025-11-20T12:00:00+01:00") catch {
        std.debug.print("Invalid date format\n", .{});
        return;
    };
    std.debug.print("CET:  2025-11-20T12:00:00+01:00 -> {}\n", .{epoch_cet});

    // Test EST (-05:00)
    const epoch_est = parseIso8601ToEpoch("2025-11-20T12:00:00-05:00") catch {
        std.debug.print("Invalid date format\n", .{});
        return;
    };
    std.debug.print("EST:  2025-11-20T12:00:00-05:00 -> {}\n", .{epoch_est});

    // Show timezone enum
    std.debug.print("\nTimezone offsets:\n", .{});
    std.debug.print("CET offset: {} seconds ({s})\n", .{ Timezone.CET.toOffset(), Timezone.CET.toString() });
    std.debug.print("EST offset: {} seconds ({s})\n", .{ Timezone.EST.toOffset(), Timezone.EST.toString() });
}
