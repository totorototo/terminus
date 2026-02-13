# Terminus

<p align="left">

<a href="src/"><img src="https://img.shields.io/badge/Frontend-React%20%2B%20Three.js-purple" alt="Frontend React"></a>
<a href="zig/"><img src="https://img.shields.io/badge/Backend-Zig%200.15.2-blue" alt="Zig Backend"></a>
<a href="CLAUDE.md"><img src="https://img.shields.io/badge/Claude%20Code-Optimized-orange" alt="Claude Code Optimized"></a>

</p>

High-performance GPS route analysis and 3D visualization tool. Process large GPX files with interactive elevation profiles, real-time section analytics.

## Architecture

**Web App**: React + Vite frontend with React Three Fiber for 3D visualization
**Web Workers**: Background GPS processing to maintain responsive UI
**Zig WASM**: High-performance route calculations with optimized algorithms

## Features

- **Interactive 3D Elevation Profiles**: Geographic positioning with real-time camera controls
- **Multiple Visualization Modes**:
  - Section-based coloring for route segments
  - Slope gradient coloring (5 difficulty levels)
- **Section Analytics**: Distance, elevation gain/loss, slope percentages
- **Peak Detection**: Automatic identification and visualization of peaks
- **Checkpoint Markers**: Location labels with occlusion detection and distance-based visibility
- **Live GPS Tracking**: Real-time position updates with closest point finding
- **Performance Optimized**: Web Workers + WASM for smooth 60fps rendering

## Tech Stack

- **Frontend**: React 19, Vite, Zustand (state management with DevTools/persist)
- **3D Graphics**: React Three Fiber, Three.js, Drei helpers
- **Performance**: Zig 0.15.2 → WASM via Zigar bindings with zero-copy optimization
- **Styling**: Styled-components with glass morphism theme

## Prerequisites

- **Node.js**: v18+ (recommended v20+)
- **Zig**: v0.15.2 for WASM compilation
- **npm**: Latest version

Install Zig from [ziglang.org](https://ziglang.org/download/)

## Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (or next available port)

## Claude Code Setup

This project uses structured CLAUDE.md instruction files for Claude Code:

- [`CLAUDE.md`](CLAUDE.md): Global project guidance, architecture, and commands
- [`src/CLAUDE.md`](src/CLAUDE.md): Frontend conventions and patterns
- [`zig/CLAUDE.md`](zig/CLAUDE.md): Zig/WASM conventions and memory model

Claude Code automatically applies the right context based on file type.

## Building

Vite automatically compiles Zig to WASM during the build process. No manual compilation needed.

```bash
npm run build
```

## Testing

Run JavaScript/React tests:

```bash
npm test              # Run Vitest tests (watch mode)
```

Run Zig unit tests:

```bash
npm run test:zig      # All Zig tests
npm run test:all      # Run both Zig and JavaScript tests
```

## Project Structure

```
src/
  components/           # React components for UI and 3D visualization
  store/
    slices/             # Zustand state management slices
  helpers/              # Utility functions (colors, buffers, throttling)
  utils/                # Coordinate transformations
  gpxWorker.js          # Web Worker for background GPS processing

zig/
  gpx.zig               # GPX file parsing
  gpxdata.zig           # GPX data structures
  trace.zig             # Core GPS algorithms (distance, elevation)
  simplify.zig          # Douglas-Peucker simplification
  peaks.zig             # Peak detection algorithms
  gpspoint.zig          # Haversine distance calculations
  time.zig              # Time/duration calculations
  waypoint.zig          # Waypoint data structure
  section.zig           # Section statistics structure
  main.zig              # WASM entry point and bindings
```

## Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
