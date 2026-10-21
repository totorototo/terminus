import { describe, expect, it } from "vitest";

import {
  formatRaceTime,
  formatUtcOffset,
  onRaceClock,
  raceClockNote,
  raceUtcOffset,
} from "./raceClock.js";

// Fri 21 Aug 2026, 23:00 UTC: Sat 01:00 in the Pyrenees.
const MS = Date.UTC(2026, 7, 21, 23);
const deviceOffset = -new Date(MS).getTimezoneOffset() * 60;

describe("raceUtcOffset", () => {
  it("is the first timed waypoint's", () => {
    const waypoints = [
      { time: null, utcOffset: 0 },
      { time: 1, utcOffset: 7200 },
      { time: 2, utcOffset: 3600 },
    ];
    expect(raceUtcOffset(waypoints)).toBe(7200);
  });

  it("is null in UTC, without a time, or without waypoints", () => {
    expect(raceUtcOffset([{ time: 1, utcOffset: 0 }])).toBeNull();
    expect(raceUtcOffset([{ time: null, utcOffset: 7200 }])).toBeNull();
    // Waypoints kept before the worker read the offset.
    expect(raceUtcOffset([{ time: 1 }])).toBeNull();
    expect(raceUtcOffset(undefined)).toBeNull();
  });
});

describe("formatRaceTime", () => {
  it("reads the race's clock whatever the device's", () => {
    expect(formatRaceTime(MS, 7200)).toBe("Sat 01:00");
    expect(formatRaceTime(MS, -16200)).toBe("Fri 18:30");
    expect(formatRaceTime(MS, 7200, "day")).toBe("Sat 22 Aug");
  });

  it("reads the device's without an offset", () => {
    const local = new Date(MS);
    const hh = String(local.getHours()).padStart(2, "0");
    expect(formatRaceTime(MS, null)).toMatch(new RegExp(`^\\w{3} ${hh}:00$`));
  });
});

describe("the clock note", () => {
  it("names the offset", () => {
    expect(formatUtcOffset(7200)).toBe("UTC+2");
    expect(formatUtcOffset(-16200)).toBe("UTC−4:30");
  });

  it("is shown only on a device on another clock", () => {
    expect(onRaceClock(MS, null)).toBe(true);
    expect(onRaceClock(MS, deviceOffset)).toBe(true);
    expect(raceClockNote(deviceOffset, MS)).toBeNull();
    const elsewhere = deviceOffset + 3 * 3600;
    expect(onRaceClock(MS, elsewhere)).toBe(false);
    expect(raceClockNote(elsewhere, MS)).toBe(
      `Times on the race's clock (${formatUtcOffset(elsewhere)}).`,
    );
  });
});
