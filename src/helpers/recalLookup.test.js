import { describe, expect, it } from "vitest";

import { recalLookup } from "./recalLookup.js";

const RECAL = {
  etas: [
    { endIndex: 100, cumulativeRemainingS: 1800 },
    { endIndex: 200, cumulativeRemainingS: 5400 },
  ],
};

const LOCKED = { hasGPSLock: true, raceNotStarted: false };

describe("recalLookup", () => {
  it("returns an endIndex → cumulativeRemainingS map when locked and underway", () => {
    const map = recalLookup(RECAL, LOCKED);
    expect(map).toBeInstanceOf(Map);
    expect(map.get(100)).toBe(1800);
    expect(map.get(200)).toBe(5400);
    expect(map.get(999)).toBeUndefined();
  });

  it("returns null without a GPS lock", () => {
    expect(
      recalLookup(RECAL, { hasGPSLock: false, raceNotStarted: false }),
    ).toBeNull();
  });

  it("returns null before the race has started", () => {
    expect(
      recalLookup(RECAL, { hasGPSLock: true, raceNotStarted: true }),
    ).toBeNull();
  });

  it("returns null when recalibration is absent or empty", () => {
    expect(recalLookup(null, LOCKED)).toBeNull();
    expect(recalLookup({ etas: [] }, LOCKED)).toBeNull();
    expect(recalLookup({}, LOCKED)).toBeNull();
  });
});
