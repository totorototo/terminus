---
applyTo: "src/**/*.{tsx,jsx}"
---

## React/JavaScript Guidelines

### State Management (Zustand)

- Use Zustand for state management
- Keep state minimal and flat
- Use slices for domain separation (appSlice, gpsSlice, etc.)
- Avoid nested objects that trigger unnecessary re-renders
- Prefer computed values over stored derived state

### Component Best Practices

- Memoize expensive computations with `useMemo`
- Keep component tree shallow
- Use refs for high-frequency updates (60fps animations)
- Prefer functional components with hooks
- Keep components small and focused (<200 lines)

### WASM Integration

```javascript
// Always initialize WASM once
const { __zigar } = await import("../zig/trace.zig");
await __zigar.init();

// Always clean up Zig objects manually
const trace = Trace.init(coordinates);
const results = trace.valueOf(); // Copy to JS before cleanup
trace.deinit(); // Required: Zig doesn't have GC
```

### Web Workers Communication

- **Message pattern**: `{ type, data, id }` for request/response tracking
- **Copy data before sending**: Zigar proxy objects don't transfer
- **Convert BigInt to Number**: Zig i64 becomes BigInt in JS
- **Convert Zig strings**: Use `.string` property for `[]const u8`

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

### Three.js / React Three Fiber

- Use `useFrame` for animations, not `requestAnimationFrame`
- Memoize geometries and materials with `useMemo`
- Prefer declarative over imperative
- Use `@react-spring/three` for smooth animations
- Use `useRef` for direct Three.js object access

### Error Handling

```javascript
// Always handle WASM initialization
try {
  await initializeZig();
  // ... work
} catch (error) {
  console.error("WASM initialization failed:", error);
  // Handle gracefully
}
```

### Performance

- Target 60fps for all interactions
- Offload heavy computations to Web Workers
- Use React.memo for expensive components
- Debounce/throttle high-frequency events
- Profile with Chrome DevTools before optimizing

### Common Pitfalls

❌ **DON'T**:

- Send Zigar proxy objects through postMessage
- Forget to call `.deinit()` on Zig objects
- Store BigInt in React state (use Number)
- Create new Workers repeatedly (reuse singleton)
- Use `useState` for high-frequency updates (use refs)

✅ **DO**:

- Copy WASM data to plain JS before sending
- Initialize workers once and reuse
- Use `valueOf()` to convert Zigar proxies
- Profile performance with DevTools
- Test worker communication thoroughly
