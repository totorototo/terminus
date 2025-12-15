---
applyTo: "zig/**/*.{zig}"
---

## Zig Guidelines (Version 0.15.2)

### Project Structure

- Place all Zig source files in the `zig/` directory
- Write modular code with clear separation of concerns
- write inline tests for all public functions

### Naming Conventions

- Use `CamelCase` for types and structs
- Use `snake_case` for functions and variables

### Memory Management

#### Always Use defer for Cleanup

```zig
pub fn processData(allocator: std.mem.Allocator) !void {
    var list = std.ArrayList(T){};
    defer list.deinit(allocator); // Cleanup on any return/error

    var spaces = std.ArrayListUnmanaged(Box){};
    defer spaces.deinit(allocator);

    // Work... automatic cleanup even if error occurs
}
```

#### Returning Owned Slices

```zig
pub fn getData(allocator: std.mem.Allocator) ![]T {
    var list = std.ArrayList(T){};
    // Don't defer! Caller owns the data

    // Fill list...

    return list.toOwnedSlice(allocator); // Transfer ownership
}

// Caller must free:
const data = try getData(allocator);
defer allocator.free(data);
```

#### Error Handling with errdefer

```zig
pub fn complex(allocator: std.mem.Allocator) !Result {
    const data = try allocator.alloc(u8, 100);
    errdefer allocator.free(data); // Only on error

    const more = try allocator.alloc(u8, 200);
    errdefer allocator.free(more); // Only on error

    // If success, caller owns both allocations
    return Result{ .data = data, .more = more };
}
```

### WASM Compilation

```bash
# For Zigar/Vite (via rollup-plugin-zigar)
zig build-lib trace.zig \
  -target wasm32-wasi \
  -dynamic \
  -OReleaseSmall \
  --name trace
```

### Testing

```zig
const std = @import("std");
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;
const expectApproxEqAbs = std.testing.expectApproxEqAbs;

test "descriptive test name" {
    const allocator = std.testing.allocator; // Detects leaks!

    var trace = try Trace.init(allocator, points);
    defer trace.deinit(allocator);

    try expectEqual(@as(usize, 10), trace.points.len);
    try expectApproxEqAbs(100.0, trace.totalDistance, 0.001);
}
```

### Common Patterns

#### Iterating with Index

```zig
for (items, 0..) |item, i| {
    // Use both item and index
}
```

#### Use @memcpy for Bulk Copy

```zig
const copy = try allocator.alloc([3]f64, points.len);
@memcpy(copy, points);
```

### Performance Tips

- Prefer stack allocation for small buffers: `var buffer: [4096]u8 = undefined;`
- Use `@memcpy` for bulk copies
- Minimize allocations, especially in loops
- Reuse buffers when possible
- Use defer for cleanup

### Common Pitfalls

❌ **DON'T**:

- Mix managed/unmanaged ArrayList patterns
- Forget allocator in ArrayList methods
- Forget buffer for file.writer()
- Skip .flush() on buffered writers
- Allocate in hot loops

✅ **DO**:

- Use defer for cleanup
- Use errdefer for error-case cleanup
- Test with std.testing.allocator (catches leaks)
- Document algorithm complexity
- Add inline tests for all public functions
