# Zig (0.17.0): the WASM boundary over gpxz

The computation lives in [gpxz](https://github.com/totorototo/gpxz), pinned by commit in
`build.zig.zon`. This directory only holds the boundary Zigar compiles to WASM:

```
terminus.zig     ── What the worker imports: readGPXComplete, recalibrate,
                    generateAudioFrames, and the Trace / Route / WeatherLookup types
build.zig.zon    ── Pins gpxz (same commit as retrace when possible)
build.zig        ── Native test build: `zig build test` (Zigar ignores it)
build.extra.zig  ── Zigar hook: gives the WASM build the `gpxz` import
```

## Rules

- **No algorithms here.** A fix or feature in parsing, trace, climbs, sections, stages, pace
  model or soundscape goes into gpxz; then bump the pin from `zig/`:
  `zig fetch --save git+https://github.com/totorototo/gpxz#<commit>`.
- **Validate before gpxz asserts.** gpxz asserts its preconditions, and in ReleaseSmall a
  failed assert is undefined behavior, not a trap. Every value JavaScript passes in is
  checked in `terminus.zig` (settings, elapsed time, index range, slice lengths) and turned
  into an error the worker posts as `ERROR`.
- **Exports are camelCase** (they are the JavaScript API); implementation and gpxz are
  snake_case, TIGER_STYLE.
- **gpxz's structs cross the boundary as they are**, not as JSON (unlike retrace): the worker
  reads `points_flat` and `points_full_resolution` as zero-copy Float64Array views. The worker
  (`src/gpxWorker.js`) is the only place that renames gpxz's snake_case fields to the store's
  camelCase shapes.
- Every struct returned holds WASM memory: the worker frees it with `.deinit()`.

## Tests

`npm run test:zig` (= `cd zig && zig build test --summary all`). Use `std.testing.allocator`
so leaks fail the test. gpxz's own tests run in gpxz.
