# Terminus

<p align="left">

<a href="src/"><img src="https://img.shields.io/badge/Frontend-React%20%2B%20Three.js-purple" alt="Frontend React"></a>
<a href="zig/"><img src="https://img.shields.io/badge/Backend-Zig%200.15.2-blue" alt="Zig Backend"></a>
<a href="CLAUDE.md"><img src="https://img.shields.io/badge/Claude%20Code-Optimized-orange" alt="Claude Code Optimized"></a>

</p>

High-performance GPS route analysis and 3D visualization tool. Process large GPX files with interactive elevation profiles and real-time section analytics. Supports live location sharing between runners and followers via WebSocket relay.

## Architecture

**Web App**: React + Vite frontend with React Three Fiber for 3D visualization
**Web Workers**: Background GPS processing to maintain responsive UI
**Zig WASM**: High-performance route calculations with optimized algorithms

## Features

- **Interactive 3D Elevation Profiles**: Geographic positioning with real-time camera controls
- **Multiple Visualization Modes**:
  - Section-based coloring for route segments
  - Slope gradient coloring (5 difficulty levels)
- **Section Analytics**: Distance, elevation gain/loss, slope percentages, difficulty rating
- **ETA Estimation**: Arrival time prediction per section based on difficulty
- **Peak Detection**: Automatic identification and visualization of peaks
- **Checkpoint Markers**: Location labels along the route with distance-based visibility
- **Off-Course Detection**: Automatic detection with visual scene alert and 3D label
- **Runner / Follower Modes**: First-run wizard for role selection — runners broadcast their position, followers track it on the 3D trail
- **Live GPS Tracking**: Real-time position updates on the 3D trail
- **Live Location Sharing**: Broadcast your position to followers in real time
- **Dark/Light Theme**: Toggle between dark and light modes

## Tech Stack

- **Frontend**: React 19, Vite, Zustand (state management with DevTools/persist)
- **3D Graphics**: React Three Fiber, Three.js, Drei helpers
- **Performance**: Zig 0.15.2 → WASM via Zigar bindings with zero-copy optimization
- **Real-time**: PartyKit WebSocket relay for live location sharing
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

### Simulating GPS on iOS Simulator

To test live GPS tracking features without a physical device, use the included script to simulate movement along the VVX XGTV 2026 route in the iOS Simulator:

```bash
node scripts/simulate-location.js                  # default: 2m/s, 70 points, update every 100m
node scripts/simulate-location.js 5               # 5m/s walking/running pace
node scripts/simulate-location.js 5 100 50        # 5m/s, 100 waypoints, update every 50m
```

The script samples evenly-spaced points from the GPX track and feeds them to the iOS Simulator via `xcrun simctl`. Make sure a Simulator is booted before running. Press `Ctrl+C` to stop the simulation, or clear it with:

```bash
xcrun simctl location booted clear
```

### Simulating live location via PartyKit

To replay a GPX route as live position updates broadcast to a PartyKit room (useful for testing the follower view without a physical runner):

```bash
# Usage
node scripts/simulate-partykit.js <gpx-file> <room-id> <race-id> [speed_m_per_s] [update_every_m]

# Examples
node scripts/simulate-partykit.js public/vvx-xgtv-2026.gpx ABC123 vvx-xgtv-2026        # 2 m/s, update every 100 m
node scripts/simulate-partykit.js public/vvx-xgtv-2026.gpx ABC123 vvx-xgtv-2026 500 500 # 500 m/s, 1 update/sec (fast replay)
```

By default the script targets `localhost:1999`. Set `PARTYKIT_HOST` to target a deployed instance:

```bash
PARTYKIT_HOST=<your-partykit-host> node scripts/simulate-partykit.js public/vvx-xgtv-2026.gpx ABC123 vvx-xgtv-2026
```

Open the app as a follower and join room `ABC123` to watch the position move in real time.

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

party/
  server.js             # PartyKit WebSocket relay server for live location sharing

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
