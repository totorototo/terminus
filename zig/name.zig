const std = @import("std");

const syllables = [_][]const u8{
    "an",  "ar", "bo", "da", "el", "fi", "ge", "ha", "jo", "ka",  "li",
    "mo",  "na", "or", "pe", "ri", "sa", "ta", "ul", "va", "öa", "äy",
    "åx",
};

pub fn generateIkeaName(allocator: std.mem.Allocator, random: std.Random) ![]u8 {
    const minSyllables = 2;
    const maxSyllables = 4;
    const count = random.intRangeAtMost(usize, minSyllables, maxSyllables);

    var nameLen: usize = 0;
    var parts: [maxSyllables][]const u8 = undefined;

    var i: usize = 0;
    while (i < count) : (i += 1) {
        const idx = random.intRangeAtMost(usize, 0, syllables.len - 1);
        parts[i] = syllables[idx];
        nameLen += parts[i].len;
    }

    var name = try allocator.alloc(u8, nameLen);
    errdefer allocator.free(name);

    var offset: usize = 0;
    i = 0;
    while (i < count) : (i += 1) {
        @memcpy(name[offset..(offset + parts[i].len)], parts[i]);
        offset += parts[i].len;
    }

    // Capitalize first letter
    if (nameLen > 0 and name[0] >= 'a' and name[0] <= 'z') {
        name[0] = name[0] - 32;
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

    // Minimum is 2 syllables (2 chars each = 4), maximum is 4 syllables (2 chars each = 8)
    // But syllables can be different lengths, so just check reasonable bounds
    try testing.expect(name.len >= 4); // At least 2 syllables of 2 chars
    try testing.expect(name.len <= 8); // At most 4 syllables of 2 chars
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
