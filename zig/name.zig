const std = @import("std");

// Swedish-inspired syllables for authentic IKEA-style names
const syllables = [_][]const u8{
    "an",   "ar",   "bo",   "da",  "el",     "fi",  "ge",  "ha",     "jo",   "ka",
    "li",   "mo",   "na",   "or",  "pe",     "ri",  "sa",  "ta",     "ul",   "va",
    "ög",  "äs",  "ål",  "ek",  "björk", "mal", "fal", "ström", "berg", "sky",
    "sjö", "vall", "mark", "hus", "liv",
};

/// Generate a random IKEA-style name with Swedish character patterns
/// Caller owns the returned memory and must free it
pub fn generateIkeaName(allocator: std.mem.Allocator, random: std.Random) ![]u8 {
    const minSyllables = 2;
    const maxSyllables = 3; // Reduced from 4 for more realistic names
    const count = random.intRangeAtMost(usize, minSyllables, maxSyllables);

    var nameLen: usize = 0;
    var parts: [maxSyllables][]const u8 = undefined;

    // Build syllable sequence
    for (0..count) |i| {
        const idx = random.intRangeAtMost(usize, 0, syllables.len - 1);
        parts[i] = syllables[idx];
        nameLen += parts[i].len;
    }

    var name = try allocator.alloc(u8, nameLen);
    errdefer allocator.free(name);

    // Copy syllables into final name
    var offset: usize = 0;
    for (0..count) |i| {
        @memcpy(name[offset..(offset + parts[i].len)], parts[i]);
        offset += parts[i].len;
    }

    // Capitalize first letter (handle UTF-8 special chars)
    if (nameLen > 0) {
        if (name[0] >= 'a' and name[0] <= 'z') {
            name[0] = name[0] - 32; // Convert to uppercase
        } else if (name[0] == 0xC3 and nameLen > 1) {
            // Handle UTF-8 Swedish chars (å, ä, ö)
            // å (0xC3 0xA5) -> Å (0xC3 0x85)
            // ä (0xC3 0xA4) -> Ä (0xC3 0x84)
            // ö (0xC3 0xB6) -> Ö (0xC3 0x96)
            if (name[1] >= 0xA0 and name[1] <= 0xBF) {
                name[1] = name[1] - 0x20;
            }
        }
    }

    return name;
}

// Tests
const testing = std.testing;

test "generateIkeaName creates non-empty string" {
    const allocator = testing.allocator;
    var prng = std.Random.DefaultPrng.init(12345);
    const random = prng.random();

    const name = try generateIkeaName(allocator, random);
    defer allocator.free(name);

    try testing.expect(name.len > 0);
}

test "generateIkeaName capitalizes first letter" {
    const allocator = testing.allocator;
    var prng = std.Random.DefaultPrng.init(12345);
    const random = prng.random();

    const name = try generateIkeaName(allocator, random);
    defer allocator.free(name);

    // First character should be uppercase (A-Z) or special char
    if (name[0] >= 'A' and name[0] <= 'Z') {
        try testing.expect(true);
    } else {
        // Could be special character like Ö, Ä, Å
        try testing.expect(name[0] >= 128 or name[0] < 'a');
    }
}

test "generateIkeaName respects syllable count range" {
    const allocator = testing.allocator;
    var prng = std.Random.DefaultPrng.init(12345);
    const random = prng.random();

    const name = try generateIkeaName(allocator, random);
    defer allocator.free(name);

    // Minimum is 2 syllables (2 chars each = 4), maximum is 3 syllables
    // Syllables vary in length (2-5 chars), so check reasonable bounds
    try testing.expect(name.len >= 4); // At least 2 syllables of 2 chars
    try testing.expect(name.len <= 15); // At most 3 syllables of 5 chars
}

test "generateIkeaName generates different names with different seeds" {
    const allocator = testing.allocator;

    var prng1 = std.Random.DefaultPrng.init(12345);
    const random1 = prng1.random();
    const name1 = try generateIkeaName(allocator, random1);
    defer allocator.free(name1);

    var prng2 = std.Random.DefaultPrng.init(67890);
    const random2 = prng2.random();
    const name2 = try generateIkeaName(allocator, random2);
    defer allocator.free(name2);

    // Names should be different with different seeds
    try testing.expect(!std.mem.eql(u8, name1, name2));
}

test "generateIkeaName generates same name with same seed" {
    const allocator = testing.allocator;

    var prng1 = std.Random.DefaultPrng.init(12345);
    const random1 = prng1.random();
    const name1 = try generateIkeaName(allocator, random1);
    defer allocator.free(name1);

    var prng2 = std.Random.DefaultPrng.init(12345);
    const random2 = prng2.random();
    const name2 = try generateIkeaName(allocator, random2);
    defer allocator.free(name2);

    // Same seed should produce same name
    try testing.expectEqualStrings(name1, name2);
}

test "generateIkeaName uses valid syllables" {
    const allocator = testing.allocator;
    var prng = std.Random.DefaultPrng.init(12345);
    const random = prng.random();

    // Generate multiple names to test syllable usage
    var i: usize = 0;
    while (i < 10) : (i += 1) {
        const name = try generateIkeaName(allocator, random);
        defer allocator.free(name);

        // Name should be composed of valid syllables (all lowercase except first char)
        // After first char, should only contain a-z and special chars
        var j: usize = 1;
        while (j < name.len) : (j += 1) {
            const c = name[j];
            try testing.expect((c >= 'a' and c <= 'z') or c >= 128);
        }
    }
}

test "generateIkeaName handles allocation" {
    const allocator = testing.allocator;
    var prng = std.Random.DefaultPrng.init(12345);
    const random = prng.random();

    // Generate and free multiple names to test allocation/deallocation
    var i: usize = 0;
    while (i < 100) : (i += 1) {
        const name = try generateIkeaName(allocator, random);
        allocator.free(name);
    }
}
