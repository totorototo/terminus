# Frontend Conventions

## File Naming

- `Component.jsx` + `Component.style.js` (styled-components) + `Component.test.js`

## State (Zustand)

- Slices for domain separation (`store/slices/`: app, gpx, gps, worker, sections, stats, wayPoints)
- Keep state flat — avoid nested objects that trigger unnecessary re-renders
- `useShallow()` for selectors returning objects
- Prefer computed values over stored derived state

## Worker (`gpxWorker.js`)

- Singleton — never create new instances, reuse the one from startup
- Messages use `{ type, data, id }` format for request/response tracking
- navigo's `Trace` lives in WASM memory — always call `.free()` when done with one
- navigo's JSON output is camelCase but uses kilometers for distances; the rest of the app expects meters — convert at the worker boundary, not downstream
- Build the `Trace` with `parseGpxAll` (not plain `parseGpx`) whenever you'll call `.analyze()` or `.recalibrate()` on it — plain `parseGpx` returns an empty waypoint list, so those calls come back with empty/null results

Example sanitization (section stats):

```javascript
const sanitizedSections = sections.map((s) => ({
  sectionId: s.id,
  startLocation: s.startLocation,
  endLocation: s.endLocation,
  totalDistance: s.totalDistanceKm * 1000, // km → m
  totalElevation: s.totalElevationGainM,
  paceFactor: s.paceFactor,
}));
```

## Code Conventions

- Always use theme tokens for colors — never inline colors or hardcoded color values.
- Keep styles in separate `.styles.js` files, not in component files.

## Performance

- Use refs (not state) for high-frequency 60fps updates (e.g. `useFrame` loops)
- Memoize Three.js geometries/materials with `useMemo`
