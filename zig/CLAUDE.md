# Zig Codebase (0.15.2)

## Module Map

```
gpx.zig        ── GPX parsing (manual std.mem scanning, no XML lib)
trace.zig      ── Trace struct: core computation (distances, elevations, slopes, peaks)
extrema.zig    ── AMPD peak & valley detection algorithm
climbs.zig     ── Climb segment detection (Garmin-style qualification)
simplify.zig   ── Douglas-Peucker simplification
elevation.zig  ── Denoised D+/D- (distance-windowed median + hysteresis deadband)
gpspoint.zig   ── Pure math on [3]f64 (Haversine, bearing, elevation)
gpxdata.zig    ── Data structs: GPXData, Waypoint, Metadata
leg.zig        ── LegStats: per-waypoint-pair intervals (Naismith)
section.zig    ── SectionStats data struct (camelCase fields — maps to JS)
stage.zig      ── StageStats: LifeBase-to-LifeBase groupings (Minetti)
segment.zig    ── Shared per-point Minetti metrics for sections & stages
minetti.zig    ── Metabolic-cost slope model (Minetti et al. 2002): cmet, paceFactor
paceModel.zig  ── Full pace model: folds minetti's slope factor together with
                  fatigue, circadian and weather into one combined multiplier
                  (computeFactors)
soundscape.zig ── Audio frame generation from trace arrays
time.zig       ── ISO 8601 → epoch parsing
```

`readGPXComplete` → `GPXData { trace, waypoints, sections, metadata }` is the main WASM entry point.

## Core Data Model

Coordinates are `[3]f64` with index constants from `gpspoint.zig`:

```zig
IDX_LAT = 0, IDX_LON = 1, IDX_ELEV = 2
```

`Trace` holds parallel arrays (same length as `points`): `cumulativeDistances`, `cumulativeElevations`, `cumulativeElevationLoss`, `slopes`, `peaks`.

## Function Signature Pattern

Allocating functions take `allocator` as first arg, return `![]T`. Caller owns the result:

```zig
pub fn douglasPeuckerSimplify(allocator, points: []const [3]f64, epsilon: f64) ![][3]f64
pub fn findPeaks(allocator, signal: []const f32) ![]usize
pub fn readTracePoints(allocator, bytes: []const u8) ![][3]f64
```

## Memory Patterns

**errdefer stacking** — each allocation gets its own `errdefer` as you go:

```zig
const distances = try allocator.alloc(f64, len);
errdefer allocator.free(distances);
const elevations = try allocator.alloc(f64, len);
errdefer allocator.free(elevations);
```

**errdefer for slice-of-structs** — free each element then the container:

```zig
errdefer {
    for (waypoints.items) |*wpt| wpt.deinit(allocator);
    waypoints.deinit(allocator);
}
```

**toOwnedSlice + defer deinit** — safe because `toOwnedSlice` empties the list:

```zig
var list = std.ArrayList(usize){};
defer list.deinit(allocator);
// ... append items ...
return try list.toOwnedSlice(allocator);
```

**Temp buffers** — allocated and freed within the same function via plain `defer`:

```zig
const elevations = try allocator.alloc(f32, len);
defer allocator.free(elevations);
```

**deinit guards** against zero-length slices (from empty input):

```zig
if (self.points.len != 0) allocator.free(self.points);
```

## GPX Parsing Idiom

Manual scanning with `std.mem.indexOfPos`. Named blocks (`blk:`) for optional extraction — `orelse break` skips the element silently:

```zig
const lat = blk: {
    const lat_pos = std.mem.indexOfPos(u8, bytes[start..end], 0, "lat=\"") orelse break;
    break :blk std.fmt.parseFloat(f64, bytes[s..e]) catch break;
};
```

Strings are always `allocator.dupe(u8, slice)` — never store references into the input buffer.

## Testing

Co-located in each file. Named `"<subject>: <scenario>"`. Always use `std.testing.allocator`.

```zig
test "distance: known coordinates (Paris to London)" { ... }
test "Trace with large dataset applies simplification" { ... }
```

Use `@as` for type-explicit expectations:

```zig
try testing.expectEqual(@as(usize, 3), points.len);
try testing.expectApproxEqAbs(expected, actual, tolerance);
```

## WASM

Compiled via `rollup-plugin-zigar` with `ReleaseSmall`. All `pub` declarations are exported. Return types must be Zigar-marshalable: `f64`, `f32`, `i64`, `[]u8`, slices, flat structs.
