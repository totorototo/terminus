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
- Never `postMessage` Zigar proxy objects — use `valueOf()` to copy to plain JS first
- Convert Zig strings via `.string`, Zig `i64` via `Number()` (no BigInt in state)

Example sanitization:

```javascript
const sanitizedData = [];
for (let i = 0; i < zigData.items.length; i++) {
  const item = zigData.items[i];
  sanitizedData.push({
    value: item.value,
    name: item.name.string, // Zig string → JS string
    time: item.time ? Number(item.time) : null, // BigInt → Number
  });
}
```

## Performance

- Use refs (not state) for high-frequency 60fps updates (e.g. `useFrame` loops)
- Memoize Three.js geometries/materials with `useMemo`
