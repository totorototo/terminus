# Terminus

High-performance GPS route analysis and 3D visualization tool. Process large GPX files with interactive elevation profiles, real-time section analytics.

## Architecture

**Web App**: React + Vite frontend with React Three Fiber for 3D visualization  
**Web Workers**: Background GPS processing to maintain responsive UI  
**Zig WASM**: High-performance route calculations with optimized algorithms  
**Vite Plugin**: Custom GPX file loader for seamless route data import

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

- **Frontend**: React 18, Vite, Zustand (state management with DevTools/persist)
- **3D Graphics**: React Three Fiber, Three.js, Drei helpers
- **Performance**: Zig 0.14.0 → WASM via Zigar bindings with zero-copy optimization
- **Styling**: Styled-components with glass morphism theme

## Prerequisites

- **Node.js**: v18+ (recommended v20+)
- **Zig**: v0.14.0 for WASM compilation
- **npm**: Latest version

Install Zig from [ziglang.org](https://ziglang.org/download/)

## Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (or next available port)

## Building

Vite automatically compiles Zig to WASM during the build process. No manual compilation needed.

```bash
npm run build
```

## Testing

Run JavaScript/React tests:

```bash
npm test              # Run all tests
npm run test:coverage # Generate coverage report
```

Run Zig unit tests:

```bash
cd zig
zig test trace.zig
```

## Project Structure

```
src/
  components/           # React components
    scene/              # Main 3D scene container with lighting and controls
    profile/            # Enhanced 3D elevation mesh with vertex coloring
    marker/             # Checkpoint markers with animations and occlusion
    commands/           # UI controls (file upload, tracking modes, slopes)
    trailFollower/      # Animated runner following GPS trace
    cameraController/   # Smooth camera transitions and orbital controls
    navigation/         # Bottom panel with trail/section data
  store/                # Zustand state management
    slices/             # State slices (app, gps, stats, worker)
  utils/                # Coordinate transforms (lat/lon → meters)
  helpers/              # Utility functions (colors, ring buffer, throttle)
  gpsWorker.js          # Web Worker
  theme/                # Styled-components theme (glass morphism)
zig/
  trace.zig             # Core GPS algorithms and cumulative calculations
  peaks.zig             # Peak detection with prominence filtering
  gpspoint.zig          # Haversine distance and geometry calculations
  waypoint.zig          # Waypoint/checkpoint handling
  gpx.zig               # GPX file parsing and generation
  csv.zig               # CSV checkpoint generation with IKEA-style names
```

## Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
