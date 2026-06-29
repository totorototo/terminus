# CLAUDE.md

## General Rules

- When asked to fix or update something, scope changes narrowly to the specific request. Do not change unrelated code, global styles, or other components unless explicitly asked.

## Project Overview

Terminus is a high-performance GPS trail visualization web application combining React for UI with `@totorototo/navigo` (Rust compiled to WebAssembly) for computational performance.

**Tech Stack**:

- Frontend: React 19 + Vite
- Performance: `@totorototo/navigo` (Rust → WebAssembly), published from https://github.com/totorototo/navigo
- 3D: Three.js + React Three Fiber
- State: Zustand
- Build: Vite

**Requires**: Node.js 18+

## Core Principles

### Performance First

- Heavy computation (GPS, algorithms) → navigo (WASM)
- UI rendering and interaction → React
- Background processing → Web Workers
- Target 60fps for all interactions

### Memory Management

- **navigo `Trace`**: Manual cleanup required — always call `.free()` when done with a `Trace` handle (it lives in WASM linear memory; JS GC cannot reclaim it)
- **Web Workers**: Convert navigo's km-based distances to the app's existing meter contract in `gpxWorker.js` before posting results — that worker is the only place that should know navigo's shape

## Commands

```bash
npm run dev              # Dev server (port 5173)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Vitest (watch mode, co-located *.test.js)
npm run test:all         # Alias for npm test
```

## Architecture

**React UI** → **Web Worker** (`src/gpxWorker.js`) → **navigo WASM** (`@totorototo/navigo/web`) → results sanitized to plain JS → **Zustand store** → re-render

- `src/components/` — React components (scene, profile, peaks, markers, panels)
- `src/store/` — Zustand store with slice pattern (slices in `slices/`)
- `src/helpers/` — Pure utilities (colors, geometry, throttle)
- `src/utils/` — Coordinate transforms (geo → 3D scene space)

GPX parsing, route calculations, peak detection, simplification, and pace modeling all live in the separate [navigo](https://github.com/totorototo/navigo) repo — trail-math changes happen there, then get released as a new `@totorototo/navigo` version and bumped here.

Live recalibration (mid-race ETA recalculation) is driven by navigo's `Trace.recalibrate()` (added in navigo v0.6.0), called from `gpxWorker.js`'s `recalibrate()` handler. It still degrades gracefully to non-recalibrated pace estimates whenever navigo returns `null` for a boundary kind (fewer than two boundaries of that kind, or no GPS fix yet). The `Trace` it's called on must come from `parseGpxAll` (v0.9.0+), not plain `parseGpx` — the latter carries no waypoints, so `.recalibrate()` would always return `null` for both boundary kinds.

See `src/CLAUDE.md` for frontend conventions.

## Git Workflow

- Always run tests and lint before committing or pushing. Never commit code that fails tests or lint checks.
- Always run `npm run test:all` before committing or pushing; fix failures before proceeding
