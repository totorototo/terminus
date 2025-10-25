# Terminus

High-performance GPS route analysis and 3D visualization tool. Process large GPX files with interactive elevation profiles, real-time section analytics.

## Architecture

**Web App**: React + Vite frontend with React Three Fiber for 3D visualization  
**Web Workers**: Background GPS processing to maintain responsive UI  
**Zig WASM**: High-performance route calculations with optimized algorithms  
**Vite Plugin**: Custom GPX file loader for seamless route data import

## Features

- Interactive 3D elevation profiles with geographic positioning
- Real-time section analytics (distance, elevation gain/loss, slopes)
- Peak detection and visualization
- Checkpoint markers with location labels
- Live tracking and closest point finding
- Smooth camera controls and transitions

## Tech Stack

- **Frontend**: React 18, Vite, Zustand (state management)
- **3D Graphics**: React Three Fiber, Three.js, Drei helpers
- **Performance**: Zig WASM via Zigar bindings
- **Styling**: Styled-components with theme support

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

Run Zig unit tests:

```bash
cd zig
zig test trace.zig
```

## Project Structure

```
src/
  components/     # React components (3D scene, profiles, navigation)
  store/          # Zustand state management
  utils/          # Coordinate transforms and helpers
  gpsWorker.js    # Web Worker for GPS processing
zig/
  trace.zig       # Core GPS processing and algorithms
  peaks.zig       # Peak detection
  gpspoint.zig    # Distance and geometry calculations
```

## Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
