// Simple benchmark runner to test the performance
import { Trace, __zigar } from "../zig/trace.zig";
import { createTrack } from "positic";
import gpx from "./assets/euskalraid-ultra-2025-v2.gpx";

async function runBenchmark() {
  console.log("🚀 Starting GPS Processing Benchmark");
  
  // Initialize Zig WebAssembly
  const { init } = __zigar;
  await init();
  
  const iterations = 50;
  const coords = gpx.features[0].geometry.coordinates;
  
  // Benchmark Zig
  console.log("🔥 Testing Zig WebAssembly...");
  const zigStart = performance.now();
  
  let zigDistance = 0;
  let zigElevation = 0;
  
  for (let i = 0; i < iterations; i++) {
    const trace = Trace.init(coords);
    zigDistance = trace.totalDistance() / 1000;
    zigElevation = trace.totalElevation();
    trace.deinit();
  }
  
  const zigEnd = performance.now();
  const zigAvg = (zigEnd - zigStart) / iterations;
  
  // Benchmark Positic
  console.log("📊 Testing Positic JavaScript...");
  const positicStart = performance.now();
  
  let positicDistance = 0;
  let positicElevation = 0;
  
  for (let i = 0; i < iterations; i++) {
    const track = createTrack(coords);
    positicDistance = track.getLength() / 1000;
    positicElevation = track.getElevation().positive;
  }
  
  const positicEnd = performance.now();
  const positicAvg = (positicEnd - positicStart) / iterations;
  
  // Results
  const speedup = positicAvg / zigAvg;
  
  console.log("\n🏁 BENCHMARK RESULTS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🔥 Zig WebAssembly:`);
  console.log(`   Distance: ${zigDistance.toFixed(2)} km`);
  console.log(`   Elevation: ${zigElevation.toFixed(2)} m`);
  console.log(`   Average time: ${zigAvg.toFixed(3)} ms`);
  console.log(`   Total time: ${(zigEnd - zigStart).toFixed(2)} ms`);
  
  console.log(`\n📊 Positic JavaScript:`);
  console.log(`   Distance: ${positicDistance.toFixed(2)} km`);
  console.log(`   Elevation: ${positicElevation.toFixed(2)} m`);
  console.log(`   Average time: ${positicAvg.toFixed(3)} ms`);
  console.log(`   Total time: ${(positicEnd - positicStart).toFixed(2)} ms`);
  
  console.log(`\n🎯 WINNER: ${speedup > 1 ? 'Zig' : 'Positic'}`);
  console.log(`   Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// Run the benchmark
runBenchmark().catch(console.error);
