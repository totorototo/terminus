#!/usr/bin/env node
// Replay a GPX route as live location updates sent to a PartyKit room.
// Usage: node scripts/simulate-partykit.js <gpx-file> <room-id> <race-id> [speed_m_per_s] [update_every_m]
//   gpx-file      - path to the GPX file (absolute or relative to cwd)
//   room-id       - PartyKit room / session ID (e.g. "ABC123")
//   race-id       - race identifier sent in each message (e.g. "vvx-xgtv-2026")
//   speed_m_per_s - simulated running speed in m/s (default: 2)
//   update_every_m- send a position update every N metres travelled (default: 100)
//
// Environment:
//   PARTYKIT_HOST - PartyKit host (default: localhost:1999)

import { readFileSync } from "fs";
import { resolve } from "path";

const [, , gpxArg, roomId, raceId, speedArg, intervalArg] = process.argv;

if (!gpxArg || !roomId || !raceId) {
  console.error(
    "Usage: node scripts/simulate-partykit.js <gpx-file> <room-id> <race-id> [speed_m_per_s] [update_every_m]",
  );
  process.exit(1);
}

const speed = parseFloat(speedArg ?? 2);
const updateEvery = parseFloat(intervalArg ?? 100);

if (isNaN(speed) || speed <= 0) {
  console.error("Error: speed_m_per_s must be a positive number");
  process.exit(1);
}
if (isNaN(updateEvery) || updateEvery <= 0) {
  console.error("Error: update_every_m must be a positive number");
  process.exit(1);
}

// ── GPX parsing ──────────────────────────────────────────────────────────────

const gpxPath = resolve(process.cwd(), gpxArg);

let xml;
try {
  xml = readFileSync(gpxPath, "utf8");
} catch {
  console.error(`Error: GPX file not found at ${gpxPath}`);
  process.exit(1);
}

const matches = [
  ...xml.matchAll(
    /<trkpt lat="([^"]+)" lon="([^"]+)"[^>]*>(?:[\s\S]*?<ele>([^<]+)<\/ele>)?/g,
  ),
];

if (matches.length === 0) {
  console.error(`Error: no track points found in ${gpxPath}`);
  process.exit(1);
}

const points = matches.map((m, i) => ({
  lat: parseFloat(m[1]),
  lon: parseFloat(m[2]),
  ele: m[3] != null ? parseFloat(m[3]) : 0,
  index: i,
}));

// ── Haversine distance (metres) ───────────────────────────────────────────────

function haversine(a, b) {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLon *
      sinLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── Sample waypoints every `updateEvery` metres ──────────────────────────────

const waypoints = [{ ...points[0], distFromStart: 0 }];
let cumDist = 0;
let nextThreshold = updateEvery;

for (let i = 1; i < points.length; i++) {
  cumDist += haversine(points[i - 1], points[i]);
  if (cumDist >= nextThreshold) {
    waypoints.push({ ...points[i], distFromStart: cumDist });
    nextThreshold = cumDist + updateEvery;
  }
}

// Always include the final point
const last = points[points.length - 1];
if (waypoints[waypoints.length - 1].index !== last.index) {
  waypoints.push({ ...last, distFromStart: cumDist });
}

const totalDist = cumDist;
console.log(
  `Route: ${points.length} track points → ${waypoints.length} updates, ${(totalDist / 1000).toFixed(1)} km total`,
);
console.log(
  `Speed: ${speed} m/s  ·  update every: ${updateEvery} m  ·  ETA: ${formatDuration(totalDist / speed)}`,
);
console.log(`Room: ${roomId}  ·  Race: ${raceId}`);

// ── PartyKit WebSocket connection ─────────────────────────────────────────────

const host = process.env.PARTYKIT_HOST ?? "localhost:1999";
const isLocal = host.startsWith("localhost") || host.startsWith("127.");
const wsUrl = `${isLocal ? "ws" : "wss"}://${host}/parties/main/${roomId}`;

console.log(`\nConnecting to ${wsUrl} …`);

const ws = new WebSocket(wsUrl);

ws.addEventListener("open", () => {
  console.log("Connected. Starting replay… (Ctrl+C to stop)\n");
  runReplay();
});

ws.addEventListener("error", (e) => {
  console.error("WebSocket error:", e.message ?? e);
  process.exit(1);
});

ws.addEventListener("close", () => {
  console.log("Connection closed.");
  process.exit(0);
});

// ── Replay loop ───────────────────────────────────────────────────────────────

function runReplay() {
  let step = 0;
  const startTime = Date.now();

  function sendNext() {
    if (step >= waypoints.length) {
      console.log("\nReplay complete.");
      ws.close();
      return;
    }

    const wp = waypoints[step];
    const simTimestamp =
      startTime + Math.round((wp.distFromStart / speed) * 1000);

    const message = JSON.stringify({
      type: "location",
      timestamp: simTimestamp,
      coords: [wp.lat, wp.lon, wp.ele],
      index: wp.index,
      raceId,
    });

    ws.send(message);

    const pct = ((step + 1) / waypoints.length) * 100;
    process.stdout.write(
      `\r  [${String(step + 1).padStart(String(waypoints.length).length)}/${waypoints.length}] ` +
        `${pct.toFixed(1)}%  ${wp.lat.toFixed(5)}, ${wp.lon.toFixed(5)}  ele ${wp.ele.toFixed(0)} m`,
    );

    step++;

    if (step < waypoints.length) {
      const nextWp = waypoints[step];
      const delay = Math.round(
        ((nextWp.distFromStart - wp.distFromStart) / speed) * 1000,
      );
      setTimeout(sendNext, delay);
    } else {
      // Final point already sent above
      setTimeout(() => {
        console.log("\nReplay complete.");
        ws.close();
      }, 500);
    }
  }

  sendNext();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}
