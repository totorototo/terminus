# CLAUDE.md

## Project Overview

Terminus is a high-performance GPS trail visualization web application combining React for UI and Zig compiled to WebAssembly for computational performance.

**Tech Stack**:

- Frontend: React 19 + Vite
- Performance: Zig 0.15.2 → WebAssembly
- 3D: Three.js + React Three Fiber
- State: Zustand
- Build: Vite + rollup-plugin-zigar

**Requires**: Node.js 18+, Zig 0.15.2 in PATH

## Core Principles

### Performance First

- Heavy computation (GPS, algorithms) → Zig/WASM
- UI rendering and interaction → React
- Background processing → Web Workers
- Target 60fps for all interactions

### Memory Management

- **Zig/WASM**: Manual cleanup required — always call `.deinit()` or `.deinit(allocator)`
- **Web Workers**: Never send Zigar proxy objects through `postMessage` — copy to plain JS with `valueOf()` first
- **Zig → JS types**: Convert strings via `.string`, `i64` via `Number()` (no BigInt in React state)
- Test for leaks using `std.testing.allocator` in Zig

## Commands

```bash
npm run dev              # Dev server (port 5173)
npm run build            # Production build (includes Zig→WASM)
npm run lint             # ESLint
npm test                 # Vitest (watch mode, co-located *.test.js)
npm run test:zig         # All Zig tests
npm run test:all         # Zig tests then JS tests
```

Single Zig test: `cd zig && zig test <file>.zig`

## Architecture

**React UI** → **Web Worker** (`src/gpxWorker.js`) → **Zig WASM** (`zig/`) → results sanitized to plain JS → **Zustand store** → re-render

- `src/components/` — React components (scene, profile, peaks, markers, panels)
- `src/store/` — Zustand store with slice pattern (7 slices in `slices/`)
- `src/helpers/` — Pure utilities (colors, geometry, throttle)
- `src/utils/` — Coordinate transforms (geo → 3D scene space)
- `zig/` — GPX parsing, route calculations, peak detection, simplification, Haversine

See `src/CLAUDE.md` for frontend conventions and `zig/CLAUDE.md` for Zig/WASM conventions.
