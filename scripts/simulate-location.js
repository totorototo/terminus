#!/usr/bin/env node
// Simulate GPS movement along the VVX XGTV 2026 route in the iOS Simulator
// Usage: node scripts/simulate-location.js [speed_m_per_s] [num_points] [distance_m]
//   speed_m_per_s - movement speed in meters/second (default: 2)
//   num_points    - number of evenly-sampled track points (default: 70)
//   distance_m    - issue a location update every N meters traveled (default: 100)

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const speed = parseFloat(process.argv[2] ?? 2);
let numPoints = parseInt(process.argv[3] ?? 70, 10);
const distance = parseFloat(process.argv[4] ?? 100);

if (isNaN(speed) || speed <= 0) {
  console.error("Error: speed_m_per_s must be a positive number");
  process.exit(1);
}
if (isNaN(numPoints) || numPoints < 2) {
  console.error("Error: num_points must be an integer >= 2");
  process.exit(1);
}
if (isNaN(distance) || distance <= 0) {
  console.error("Error: distance_m must be a positive number");
  process.exit(1);
}

const gpxPath = resolve(__dirname, "../public/vvx-xgtv-2026.gpx");

let xml;
try {
  xml = readFileSync(gpxPath, "utf8");
} catch {
  console.error(`Error: GPX file not found at ${gpxPath}`);
  process.exit(1);
}

const matches = [...xml.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)"/g)];

if (matches.length === 0) {
  console.error(
    `Error: No track points found in ${gpxPath}. Is it a valid GPX file?`,
  );
  process.exit(1);
}
if (numPoints > matches.length) {
  console.warn(
    `Warning: num_points (${numPoints}) exceeds available track points (${matches.length}). Clamping.`,
  );
  numPoints = matches.length;
}

const total = matches.length;
const step = (total - 1) / (numPoints - 1);
const sampled = Array.from(
  { length: numPoints },
  (_, i) => matches[Math.round(i * step)],
);
const waypoints = sampled.map((m) => `${m[1]},${m[2]}`).join(" ");

console.log(
  `Simulating route with ${numPoints} points at ${speed}m/s, update every ${distance}m...`,
);
console.log("Press Ctrl+C to stop.\n");

try {
  execSync(
    `xcrun simctl location booted start --speed=${speed} --distance=${distance} ${waypoints}`,
    { stdio: "inherit" },
  );
} catch {
  console.error(
    "Error: xcrun failed. Is a simulator booted? Is this running on macOS?",
  );
  process.exit(1);
}
