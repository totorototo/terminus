#!/usr/bin/env node
// Shift every <time> tag in a GPX file so the race start lands on a target date.
//
// Usage:
//   node scripts/shift-gpx-dates.mjs <file.gpx> [target] [--dry-run]
//
//   target: YYYY-MM-DD            → whole-day shift, times of day preserved
//           YYYY-MM-DDTHH:MM(:SS) → exact shift, start lands on that instant (UTC)
//           omitted               → today (whole-day shift)
//
// The reference "start" is the <time> of the waypoint typed <type>Start</type>,
// falling back to the earliest <time> in the file. All <time> tags (waypoints,
// trackpoints, metadata) move by the same offset, so relative structure —
// multi-day barriers, recording cadence — is preserved.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [file, target] = args.filter((a) => a !== "--dry-run");

if (!file) {
  console.error(
    "Usage: node scripts/shift-gpx-dates.mjs <file.gpx> [YYYY-MM-DD | ISO datetime] [--dry-run]",
  );
  process.exit(1);
}

const gpx = readFileSync(file, "utf8");

const startWpt = gpx
  .match(/<wpt[\s\S]*?<\/wpt>/g)
  ?.find((w) => /<type>\s*Start\s*<\/type>/i.test(w));
const allTimes = [...gpx.matchAll(/<time>([^<]+)<\/time>/g)].map((m) => m[1]);
if (allTimes.length === 0) {
  console.error(`No <time> tags found in ${file}`);
  process.exit(1);
}
const startRaw =
  startWpt?.match(/<time>([^<]+)<\/time>/)?.[1] ??
  allTimes.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b));
const start = new Date(startRaw);

const targetRaw = target ?? new Date().toISOString().slice(0, 10);
const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(targetRaw);

let offsetMs;
if (dateOnly) {
  // why: day-granular shift keeps every time-of-day intact, so a 05:00 start
  // stays a 05:00 start — what you want when faking "the race starts today".
  const [y, m, d] = targetRaw.split("-").map(Number);
  const startDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  offsetMs = Date.UTC(y, m - 1, d) - startDay;
} else {
  const targetDate = new Date(targetRaw);
  if (Number.isNaN(targetDate.getTime())) {
    console.error(`Invalid target: ${targetRaw}`);
    process.exit(1);
  }
  offsetMs = targetDate.getTime() - start.getTime();
}

const shift = (iso) => {
  const d = new Date(new Date(iso).getTime() + offsetMs);
  // GPX in this project uses second-precision UTC; strip .000 milliseconds.
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
};

let count = 0;
const out = gpx.replace(/<time>([^<]+)<\/time>/g, (_, iso) => {
  count += 1;
  return `<time>${shift(iso)}</time>`;
});

const days = offsetMs / 86_400_000;
console.log(`start:  ${startRaw} → ${shift(startRaw)}`);
console.log(
  `offset: ${dateOnly ? `${days} day(s)` : `${offsetMs / 1000} s`} · ${count} <time> tags`,
);

if (dryRun) {
  console.log("dry run — file not modified");
} else {
  writeFileSync(file, out);
  console.log(`written: ${file}`);
}
