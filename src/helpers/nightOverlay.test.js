import { describe, expect, it } from "vitest";

import { clockTimeAtIndex } from "./nightOverlay.js";

const RACE_START_MS = new Date("2024-06-21T04:00:00Z").valueOf();

// Single section spanning a 10km/10-index course over 10 estimated hours —
// 1 hour of estimated elapsed time per index, so index N ⇔ hour N. Keeps the
// clockTimeAtIndex math trivial to reason about in tests.
function makeCourse({ km = 10, hoursPerKm = 1 } = {}) {
  const cumulativeDistances = Array.from(
    { length: km + 1 },
    (_, i) => i * 1000,
  );
  const sections = [
    {
      startIndex: 0,
      endIndex: km,
      totalDistance: km * 1000,
      estimatedDuration: km * hoursPerKm * 3600,
    },
  ];
  return { cumulativeDistances, sections };
}

describe("clockTimeAtIndex", () => {
  it("returns null when raceStartMs is null", () => {
    const { cumulativeDistances, sections } = makeCourse();
    expect(clockTimeAtIndex(5, sections, cumulativeDistances, null)).toBeNull();
  });

  it("returns raceStartMs at index 0", () => {
    const { cumulativeDistances, sections } = makeCourse();
    expect(
      clockTimeAtIndex(0, sections, cumulativeDistances, RACE_START_MS),
    ).toBe(RACE_START_MS);
  });

  it("accumulates estimated duration up to the given index", () => {
    const { cumulativeDistances, sections } = makeCourse();
    // index 5 ⇒ 5 hours elapsed
    expect(
      clockTimeAtIndex(5, sections, cumulativeDistances, RACE_START_MS),
    ).toBe(RACE_START_MS + 5 * 3600 * 1000);
  });

  it("interpolates fractionally within a section for a multi-section course", () => {
    const cumulativeDistances = [0, 1000, 2000, 3000, 4000];
    const sections = [
      {
        startIndex: 0,
        endIndex: 2,
        totalDistance: 2000,
        estimatedDuration: 3600,
      },
      {
        startIndex: 2,
        endIndex: 4,
        totalDistance: 2000,
        estimatedDuration: 7200,
      },
    ];
    // index 3 is halfway through the second section ⇒ 3600 (first section) + 3600 (half of 7200)
    expect(
      clockTimeAtIndex(3, sections, cumulativeDistances, RACE_START_MS),
    ).toBe(RACE_START_MS + 7200 * 1000);
  });
});
