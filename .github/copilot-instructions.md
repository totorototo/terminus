# GitHub Copilot Instructions - Terminus Project

## Project Overview

Terminus is a high-performance GPS trail visualization web application combining React for UI and Zig compiled to WebAssembly for computational performance.

**Tech Stack**:

- Frontend: React 19 + Vite
- Performance: Zig 0.15.2 → WebAssembly
- 3D: Three.js + React Three Fiber
- State: Zustand
- Build: Vite + rollup-plugin-zigar

## Core Principles

### 1. Performance First

- Heavy computation (GPS, algorithms) → Zig/WASM
- UI rendering and interaction → React
- Background processing → Web Workers
- Target 60fps for all interactions

### 2. Memory Management

- **JavaScript/React**: Automatic garbage collection
- **Zig/WASM**: Manual cleanup required - always call `.deinit()` or `.deinit(allocator)`
- **Web Workers**: Clean up transferred data manually
- Test for leaks using `std.testing.allocator` in Zig

### 3. Code Quality

- Write tests for all complex logic
- Keep functions small and focused
- Document non-obvious algorithms
- Use TypeScript-like patterns (type safety through naming)

## Development Workflow

### Testing

```bash
npm test              # React/JS tests
npm run test:zig      # Zig tests
npm run build         # Production build
npm run preview       # Test production build
```

### Common Tasks

- **Add feature**: Determine if Zig or React based on computation vs UI
- **Fix bug**: Check both JS console and Zig test output
- **Optimize**: Profile first, optimize bottlenecks, prefer algorithmic improvements
- **Deploy**: CI runs all tests, builds, and deploys to Netlify

## Data Flow

1. User action (React)
2. Send to Web Worker if heavy
3. Worker calls Zig WASM
4. Zig processes, returns data
5. Copy to plain JS objects
6. Update React state
7. Re-render UI

## File Structure

- `/src` - React components and app code
- `/zig` - Zig source files
- `/src/helpers` - JavaScript utilities
- `/src/store` - Zustand state management
- `/src/components` - React components

## Best Practices

### DO

✅ Use const/let, never var  
✅ Profile before optimizing  
✅ Write tests for complex logic  
✅ Clean up WASM objects manually  
✅ Use defer in Zig for cleanup  
✅ Keep components small and focused  
✅ Document algorithm complexity

### DON'T

❌ Send WASM proxy objects through postMessage  
❌ Forget to call .deinit() on Zig objects  
❌ Store BigInt in React state  
❌ Mix Zig 0.14 and 0.15 ArrayList patterns  
❌ Allocate in hot loops  
❌ Skip error handling  
❌ Commit without running tests

## CI/CD

- Use `goto-bus-stop/setup-zig@v2` for GitHub Actions
- Zig must be in PATH for build
- All tests must pass before deploy
- Build creates optimized WASM automatically

## Getting Help

For language-specific detailed guidance, see:

- `.github/instructions/backend.instructions.md` - Zig best practices (applies to `zig/**/*.zig`)
- `.github/instructions/frontend.instructions.md` - React/JS patterns (applies to `src/**/*.{tsx,jsx}`)

When asking for help:

1. Specify which layer (UI/React vs computation/Zig)
2. Include relevant error messages
3. Mention if it's build-time or runtime
4. Note if it works locally but fails in CI
