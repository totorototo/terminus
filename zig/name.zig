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
