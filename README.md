# Terminus

High-performance GPS route analysis and 3D visualization tool. Process large GPX files with interactive elevation profiles, real-time section analytics, and seamless 2D/3D mode switching. Built for performance with non-blocking processing and smooth animations.

## Architecture

**Web App**: React + Vite frontend with React Three Fiber for 3D visualization  
**Web Workers**: Background GPS processing to maintain responsive UI  
**Zig WASM**: Compiled Zig code for high-performance route calculations and geometry processing  
**React Spring**: Smooth animations and transitions between data states

## Features

- Interactive 3D elevation profiles with geographic positioning
- 2D distance-based profile view for detailed analysis
- Real-time section analytics (distance, elevation gain/loss)
- Checkpoint visualization with location labels
- Performance stress testing suite
- Non-blocking processing with progress indicators

## Run

```bash
npm install
npm run dev
```

Build Zig WASM module:

```bash
cd zig
zig build-lib -target wasm32-freestanding -O ReleaseSmall main.zig
```

## Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
