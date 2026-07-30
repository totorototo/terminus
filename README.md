# Terminus

<p align="left">

<a href="src/"><img src="https://img.shields.io/badge/Frontend-React%20%2B%20Editorial%20Story%20UI-purple" alt="Frontend React"></a>
<a href="zig/"><img src="https://img.shields.io/badge/Performance-Zig%200.15.2%20%E2%86%92%20WASM-blue" alt="Zig WASM"></a>
<a href="https://terminus-beta.netlify.app"><img src="https://img.shields.io/badge/Live%20Demo-terminus--beta.netlify.app-brightgreen" alt="Live Demo"></a>

</p>

**[→ Live Demo](https://terminus-beta.netlify.app)**

A scroll-driven editorial trail story: pick a race and scroll through it as a longform narrative — hero stats, terrain, climbs, pace model, checkpoints — with a live position marker during the run. Process large GPX files with real-time section analytics, and share live location between a runner and their followers via WebSocket relay and push notifications.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React UI (main thread)                   │
│  Story sections · Zustand store · d3 for chart geometry         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ postMessage (plain JS — no proxies)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Web Worker (gpxWorker.js)                    │
│  Owns the WASM instance · validates inputs · converts types     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Zigar JS↔Zig bindings
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Zig → WebAssembly (zig/)                     │
│  GPX parsing · Haversine · Douglas-Peucker · AMPD peak          │
│  detection · Garmin Climb Pro qualification · Minetti pace      │
│  model (slope · fatigue · circadian · weather)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               PartyKit WebSocket relay (party/)                 │
│  Runner broadcasts GPS position → followers receive in real     │
│  time, plus rate-limited Web Push (VAPID) to subscribed browsers│
└─────────────────────────────────────────────────────────────────┘
```

The Web Worker acts as a hard boundary: the main thread stays at 60 fps while the Worker owns the WASM module and all Zig memory. Results are sanitized to plain JS before crossing back to avoid Zigar proxy leaks inside React state.

The UI has no 3D scene — an earlier React Three Fiber / Three.js route visualization was replaced by a data-story page (`src/components/story/`) built around a single throughline: the route's real elevation profile, rotated 90° and drawn as a contour line behind every section, with a marker at the runner's current position.

## Features

- **Editorial Story UI**: scroll-driven sections — Hero, Now, Climbs, Terrain, Pace, Stages, Checkpoints, Map, End — each revealing on scroll against the shared elevation-contour throughline
- **Section Analytics**: distance, elevation gain/loss, slope percentages, difficulty rating
- **Stage Analytics**: per-stage distance, elevation, estimated/max time, cutoff time, difficulty, and slowest required pace, with a collapsible list for long routes
- **Climb Detection**: automatic climb segment detection (AMPD valley detection + Garmin Climb Pro qualification) with distance, elevation gain, and gradient per climb
- **Terrain Section**: elevation profile, per-point slope/grade intensity strip, and slope profile chart
- **Pace Profile**: chart of the slowest allowed pace (km/h) over distance, anchored to route start/end, with tightest-cutoff and current-section stats
- **ETA Estimation**: per-checkpoint/stage arrival prediction driven by a physiological pace model — Minetti et al. (2002) metabolic slope cost combined with exponential fatigue (`exp(k·d_eff)`, selectable Low/Moderate/High presets), a circadian sleep-deprivation slowdown, an optional weather penalty (temperature/humidity/wind/precipitation), and LifeBase recovery plus planned stop durations
- **Live Trail Progression**: real-time remaining distance and countdown to next arrival/cutoff based on runner position
- **Checkpoint Markers**: location cards with distance, planned/live schedule, and per-checkpoint weather forecast
- **Interactive 3D Map**: Mapbox GL route trace with 3D terrain (DEM exaggeration, 55° pitch) and a fullscreen toggle
- **Off-Course Detection**: automatic detection when GPS position strays from the route
- **Runner / Follower Modes**: single-step race picker — runners broadcast their position, followers join a room and track it live, with a third-person follower view
- **Live Location Sharing**: broadcast position to followers over a PartyKit WebSocket relay, authenticated by a secret write key (room id is derived via SHA-256 so followers can never forge positions)
- **Push Notifications**: followers can subscribe to Web Push (VAPID) to get a browser notification on runner position updates, rate-limited server-side
- **Shareable Finish Card**: client-generated PNG invite/summary card (Satori + embedded QR code linking to the follower room)
- **PWA**: installable as a Progressive Web App with offline support (cached routes and analytics) and home screen shortcut
- **Dark/Light Theme**: toggle between dark and light modes

## Tech Stack

- **Frontend**: React 19, Vite, Zustand (state management with DevTools/persist)
- **Charts & Map**: d3-scale/d3-shape/d3-array for chart geometry, Mapbox GL (`react-map-gl`) for the 3D terrain map
- **Performance**: Zig 0.15.2 → WASM via Zigar bindings with zero-copy optimization
- **Real-time**: PartyKit WebSocket relay for live location sharing, Web Push (VAPID) for follower notifications
- **Styling**: Styled-components, `@react-spring/web` for motion (respects `prefers-reduced-motion`)
- **PWA**: Vite PWA plugin with service worker and install prompt

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

To test live GPS tracking features without a physical device, use the included script to simulate movement along a race route in the iOS Simulator:

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
# Usage — the second argument is now a secret write key; the public room id
# followers use is derived from it (SHA-256) and printed on startup.
node scripts/simulate-partykit.js <gpx-file> <write-key> <race-id> [speed_m_per_s] [update_every_m]

# Examples
node scripts/simulate-partykit.js public/vvx-xgtv-2026.gpx ABC123 vvx-xgtv-2026        # 2 m/s, update every 100 m
node scripts/simulate-partykit.js public/vvx-xgtv-2026.gpx ABC123 vvx-xgtv-2026 500 500 # 500 m/s, 1 update/sec (fast replay)
```

By default the script targets `localhost:1999`. Set `PARTYKIT_HOST` to target a deployed instance:

```bash
PARTYKIT_HOST=<your-partykit-host> node scripts/simulate-partykit.js public/vvx-xgtv-2026.gpx ABC123 vvx-xgtv-2026
```

Open the app as a follower and join room `ABC123` to watch the position move in real time.

### Shifting GPX race dates

To debug time-dependent features (ETAs, cutoffs, circadian pace model) without waiting for race day, shift every `<time>` tag in a GPX file so the race starts on a chosen date:

```bash
npm run gpx:shift -- public/grp-160-2026.gpx                       # start = today
npm run gpx:shift -- public/grp-160-2026.gpx 2026-09-01            # start = that day
npm run gpx:shift -- public/grp-160-2026.gpx 2026-09-01T12:00:00Z  # start = exact instant
npm run gpx:shift -- public/grp-160-2026.gpx --dry-run             # preview only
```

The script anchors on the waypoint typed `Start` (falling back to the earliest time in the file) and applies one offset to all `<time>` tags — waypoints, trackpoints, and metadata — so time barriers, multi-day structure, and recording cadence stay relatively intact. A date-only target shifts by whole days and preserves times of day (a 05:00 start stays 05:00); a datetime target shifts exactly. The file is edited in place — undo with `git checkout <file>`. Times are normalized to second-precision UTC (`Z`).

## Why Zig?

GPX files for ultra-trail races can contain 10 000+ trackpoints. Running Haversine distance calculations, Douglas-Peucker simplification, and the AMPD peak-detection algorithm over that in JavaScript blocks the main thread for hundreds of milliseconds.

Zig was chosen over AssemblyScript or hand-written C for three reasons:

1. **Manual memory control** — `errdefer` guarantees cleanup on every allocation, making it practical to reason about WASM heap usage without a GC.
2. **Algorithm clarity** — Zig's comptime, tagged unions, and explicit error sets make it easier to implement and review numerically sensitive code (e.g. the AMPD scalogram) than equivalent TypeScript.
3. **Compile-time safety** — unreachable enum branches and integer overflow are caught at build time, not at runtime in a user's browser.

The tradeoff is toolchain complexity: contributors need Zig 0.15.2 on `PATH` and the `rollup-plugin-zigar` Vite plugin bridges the module boundary. For pure UI changes, Zig is never touched.

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

Run end-to-end tests:

```bash
npm run e2e            # Playwright
npm run e2e:headed     # Playwright, headed browser
```

## Project Structure

```
src/
  components/
    story/               # Editorial story UI — Story.jsx orchestrates 9 scroll sections
      sections/           # Hero, Now, Climbs, Terrain, Pace, Stages, Checkpoints, Map, End
    trailData/            # Map, ElevationProfile, PaceProfile, SlopeProfile/Intensity, WeatherLine
    followerScreen/        # Follower route entry (joins a PartyKit room)
    trailerScreen/         # Runner route entry (renders the Story)
    wizard/                 # Race picker (single-step entry)
    help/                    # User guide route
  store/
    slices/               # Zustand state management slices
  helpers/                 # Utility functions (colors, buffers, throttling, push notify)
  utils/                   # Coordinate transforms, shareable trail card generation
  hooks/                   # useGPXWorker, useCheckpointETAs, useStageETAs, etc.
  gpxWorker.js             # Web Worker for background GPS processing

party/
  server.js             # PartyKit WebSocket relay server for live location sharing
  webpush.js             # Web Push (RFC 8291/8292) via Web Crypto — no Node deps

zig/
  gpx.zig               # GPX file parsing (readGPXComplete WASM entry point)
  gpxdata.zig           # GPX data structures
  trace.zig             # Core GPS algorithms (distance, elevation)
  simplify.zig          # Douglas-Peucker simplification
  climbs.zig            # Climb segment detection (AMPD + Garmin qualification)
  extrema.zig           # AMPD peak/valley detection algorithm
  gpspoint.zig          # Haversine distance calculations
  elevation.zig         # Denoised elevation gain/loss (median + hysteresis)
  time.zig              # Time/duration calculations
  section.zig           # Section statistics structure
  leg.zig               # Leg data structure (stage sub-segments)
  stage.zig             # Stage data structure and analytics
  segment.zig           # Shared per-point Minetti metrics for sections & stages
  minetti.zig           # Minetti (2002) metabolic-cost slope pace model
  paceModel.zig         # Pace model: fatigue, circadian and weather factors
  calibration.zig       # Pace model calibration helpers
  soundscape.zig        # Audio frame generation from elevation/slope/pace data (WASM entry point wired in the worker; not currently exposed in the UI)
```

## Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
