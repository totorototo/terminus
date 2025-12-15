---
applyTo: "zig/**/*.{zig}"
---

## Zig Guidelines (Version 0.15.2)

### Key Principles

- **Simplicity First**: Zig has no runtime. Every decision about memory and performance is explicit.
- **Manual Memory Management**: Always know where the bytes are. You manage memory manually.
- **Compile-Time Power**: Use `comptime` to generate code and catch errors early.
- **Zero-Cost Abstractions**: What you write is what you get - no hidden overhead.

### Project Structure

- Place all Zig source files in the `zig/` directory
- Write modular code with clear separation of concerns
- Write inline tests for all public functions

### Naming Conventions

- **Types and Structs**: `PascalCase` (e.g., `Point`, `ArrayList`)
- **Functions and Variables**: `snake_case` (e.g., `calculate_distance`, `max_value`)
- **Constants**: `snake_case` (e.g., `default_timeout`)
- **Avoid redundancy**: Don't repeat context in names (e.g., don't use `JsonValue` in `json.JsonValue`)

### Memory Management

#### Core Rule: "Where are the bytes?"

Always be explicit about memory ownership and lifetime. When a function returns a pointer, documentation must clarify who owns it.

#### Stack vs Heap

- **Stack**: Fast, automatic cleanup. Use for fixed-size data.

  ```zig
  var buffer: [4096]u8 = undefined;  // Stack allocation
  var list = std.ArrayList(T){};      // Structure on stack, data on heap
  ```

- **Heap**: Allocator-managed. Must be freed explicitly.
  ```zig
  const data = try allocator.alloc(u8, 100);
  defer allocator.free(data);  // Always pair alloc with free
  ```

#### Using defer for Cleanup

`defer` statements execute when the function returns, even on error paths.

```zig
pub fn processData(allocator: std.mem.Allocator) !void {
    var list = std.ArrayList(T){};
    defer list.deinit(allocator);  // Runs on any return/error

    // Work with list...
}  // defer cleanup happens here
```

#### Returning Owned Slices

If a function returns allocated data, the caller owns it and must free it:

```zig
pub fn getData(allocator: std.mem.Allocator) ![]T {
    var list = std.ArrayList(T){};
    // Don't defer deinit here - we're transferring ownership

    // Fill list...

    return list.toOwnedSlice(allocator);  // Transfer ownership to caller
}

// Caller must free:
const data = try getData(allocator);
defer allocator.free(data);
```

#### Error-Case Cleanup with errdefer

Use `errdefer` to clean up only if the function returns an error:

```zig
pub fn complex(allocator: std.mem.Allocator) !Result {
    const data = try allocator.alloc(u8, 100);
    errdefer allocator.free(data);  // Only freed on error

    const more = try allocator.alloc(u8, 200);
    errdefer allocator.free(more);  // Only freed on error

    // If we reach here, both allocations are successful
    return Result{ .data = data, .more = more };
    // Caller now owns both - must free them
}
```

### Key Language Features

#### Type System

- **Primitive Types**: `u8`, `i32`, `f64`, `bool`, etc.
- **Pointers**: `*T` (single-item), `[*]T` (many-item)
- **Slices**: `[]T` (pointer + length)
- **Optionals**: `?T` (may be null)
- **Error Unions**: `!T` (value or error)

```zig
const value: u32 = 42;
const maybe: ?u32 = null;
const result: !u32 = error.Failed;  // or a u32 value
```

#### Type Coercion

Safe, automatic conversions happen when the compiler knows it's safe:

```zig
const small: u8 = 255;
const large: u16 = small;  // Safe widening - coerced automatically
const explicit: u32 = @as(u32, small);  // Explicit coercion
```

#### Variables: const vs var

- `const`: Immutable value (preferred)
- `var`: Mutable value (when needed)

```zig
const pi = 3.14;  // Immutable, type inferred
var counter: i32 = 0;  // Mutable, type required
counter += 1;
```

### Error Handling

Zig uses explicit error handling with error sets and error unions:

```zig
// Define error set
const FileError = error { FileNotFound, PermissionDenied };

// Function can return error or value
pub fn readFile(path: []const u8) ![]u8 {
    // ! means anyerror![]u8 (can return any error or the value)
    if (path.len == 0) return error.InvalidPath;
    // ... read logic
}

// Handle errors
const content = readFile("file.txt") catch |err| {
    std.debug.print("Error: {}\n", .{err});
    return err;
};

// Or use try (unwrap or return the error)
const content = try readFile("file.txt");
```

### Testing

Write tests with `std.testing.allocator` to detect memory leaks:

```zig
const std = @import("std");

test "example test" {
    const allocator = std.testing.allocator;

    var list = std.ArrayList(u32).init(allocator);
    defer list.deinit();  // Always cleanup in tests

    try list.append(42);
    try std.testing.expectEqual(@as(usize, 1), list.items.len);
    try std.testing.expectEqual(@as(u32, 42), list.items[0]);
}

test "test with descriptive name" {
    // Each test is independent
    try std.testing.expect(1 + 1 == 2);
}
```

### Common Patterns

#### Iterating with Index

```zig
// Modern Zig: using zip syntax
for (items, 0..) |item, i| {
    std.debug.print("Item {}: {}\n", .{i, item});
}

// Over multiple sequences
for (array1, array2) |a, b| {
    _ = a;
    _ = b;
}
```

#### Bulk Memory Operations

```zig
// Copy data
const source = [_]u8{ 1, 2, 3, 4, 5 };
const copy = try allocator.alloc(u8, source.len);
@memcpy(copy, &source);  // Fast, efficient copy
defer allocator.free(copy);

// Set memory
@memset(buffer[0..], 0);  // Fill with zeros

// Move with overlap handling
@memmove(dest, source);  // Safe even if ranges overlap
```

#### Optional and Error Handling

```zig
// Optional: might be null
var maybe: ?u32 = null;
if (maybe) |value| {
    std.debug.print("Got: {}\n", .{value});
} else {
    std.debug.print("Was null\n");
}

// Error union: might be error or value
const result: anyerror!u32 = someFunction();
if (result) |value| {
    std.debug.print("Success: {}\n", .{value});
} else |err| {
    std.debug.print("Error: {}\n", .{err});
}
```

#### String Handling

```zig
// String literals are const slices
const name = "hello";  // Type: *const [5:0]u8

// Working with strings
const std = @import("std");
const eq = std.mem.eql(u8, "hello", name);  // Compare
const slice = name[0..3];  // "hel" - slice of string
```

### WASM Compilation

The project uses `rollup-plugin-zigar` for automatic WASM compilation:

```bash
# Compilation happens via Vite during build
npm run build

# For development with hot reload
npm run dev
```

WASM functions are automatically exposed to JavaScript through Zigar.

### Performance Tips

- **Stack allocation preferred**: Use fixed-size buffers when size is known

  ```zig
  var buffer: [1024]u8 = undefined;  // 1KB on stack - very fast
  ```

- **Minimize allocations**: Reuse buffers when possible, batch allocations

- **Use efficient operations**: `@memcpy`, `@memset`, bulk operations are faster than loops

- **Avoid allocations in loops**: Move allocation outside the loop

- **Profile before optimizing**: Make it work, make it right, then make it fast

### Common Pitfalls

❌ **DON'T**:

- Allocate memory without freeing it (use `defer` + cleanup)
- Forget to call `.deinit()` on ArrayList and similar types
- Return dangling pointers (data freed while pointer still referenced)
- Mix managed (ArrayList) and unmanaged (ArrayListUnmanaged) patterns without clear ownership
- Use pointers after the data they point to is freed
- Assume memory is zeroed (use `undefined` for uninitialized, or explicitly zero)
- Ignore error handling (use `try` or `catch`)

✅ **DO**:

- Pair every `alloc` with `free` in corresponding `defer`
- Use `defer` for cleanup regardless of success/error
- Use `errdefer` for error-specific cleanup
- Document function ownership: "caller owns returned value"
- Test memory leaks with `std.testing.allocator`
- Use explicit types for clarity, let compiler infer when obvious
- Keep functions focused on one responsibility
- Write inline tests for complex logic
