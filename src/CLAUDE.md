# Frontend Conventions

## File Naming

- `Component.jsx` + `Component.style.js` (styled-components) + `Component.test.js`

## State (Zustand)

- Slices for domain separation (`store/slices/`: app, gpx, gps, worker, sections, stats, wayPoints)
- Keep state flat — avoid nested objects that trigger unnecessary re-renders
- `useShallow()` for selectors returning objects
- Prefer computed values over stored derived state
- The pace model (`app.paceSettings`) comes from the race's plan.json (Regimen), read by gpxz in the worker (`READ_PLAN_FILE`): the wizard takes it with the GPX and refuses one made for another route; StoryPace can replace it. Terminus never picks a model of its own — no runner-profile presets. Followers get the runner's over the relay. The live weather and recalibration still apply on top
- The plan's fueling (`app.fueling`: targets, a supply, a carry and the plan's arrival/departure times per plan entry) comes from the same plan.json and is display-only: the carry and the per-leg intake StoryFueling shows are the plan's, at the plan's times, never re-sized to live ETAs. Plan entry 0 is the start, entry i + 1 is section i's end (`lib/fueling.js`). A fueling kept before Terminus read the times has none: the view drops the intakes and totals. Followers get it with the pace settings

## Worker (`gpxWorker.js`)

- Singleton — never create new instances, reuse the one from startup
- Messages use `{ type, data, id }` format for request/response tracking
- Never `postMessage` Zigar proxy objects — use `valueOf()` to copy to plain JS first
- Convert Zig strings via `.string`, Zig `i64` via `Number()` (no BigInt in state)
- gpxz's fields are snake_case (`distance_m`, `epoch_s_start`); the sanitizers rename them to the store's camelCase (`totalDistance`, `startTime`). Keep the renaming in the worker — the store and components never see gpxz names
- The worker owns two resident WASM objects: a cached `Trace` (query handlers) and a parsed `Route` (recalibration). They are cache-owned — never `deinit()` them inside a message handler; only the cache-replacement paths free them
- Per-call WASM objects (`readGPXComplete` results, `getRouteSection`'s trace) must be freed in `try/finally` so error paths don't leak

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

## Code Conventions

- Tokens come from `@totorototo/trail-tokens` (shared with Waymark and Retrace); `src/theme/Theme.js` only re-exports it. To change a token, change it in the Trail Suite design-system artifact first, then in the package, then bump the tag here. Never edit values in this repo.
- Always use theme tokens for colors — never inline colors or hardcoded color values.
- Read colors in styles as theme interpolations: `${(props) => props.theme.colors[props.theme.currentVariant]["--color-text-muted"]}`, not `var(--color-…)`.
- Use polished `rgba()` only on opaque tokens, for decorative tints (fills, hairlines on hover). Never wrap a token that carries its own alpha (`--color-text-muted`, `--color-text-faint`, `--color-hairline`, `--color-direction-*`, `--color-profile-*`): `rgba()` replaces that alpha and breaks its checked contrast. Text steps down through `--color-text-muted` / `--color-text-faint`, never an ad-hoc alpha on `--color-text`.
- Keep styles in separate `.styles.js` files, not in component files.

## Performance

- Use refs (not state) for high-frequency 60fps updates (e.g. `useFrame` loops)
- Memoize Three.js geometries/materials with `useMemo`
