import { describe, expect, it } from "vitest";

import {
  validateArray,
  validateGPSDataResults,
  validateGPXResults,
  validateNumber,
  validateObject,
  validatePointsAtDistancesResults,
  validateRouteSectionResults,
  validateRouteStatsResults,
  validateSectionsResults,
} from "./workerValidation.js";

// ── Primitive validators ───────────────────────────────────────────────────────

describe("validateArray", () => {
  it("returns the value when it is an array", () => {
    expect(validateArray([1, 2, 3], "x")).toEqual([1, 2, 3]);
  });

  it("accepts an empty array", () => {
    expect(validateArray([], "x")).toEqual([]);
  });

  it("throws for null", () => {
    expect(() => validateArray(null, "x")).toThrow(/Expected x to be an array/);
  });

  it("throws for an object", () => {
    expect(() => validateArray({}, "x")).toThrow(/Expected x to be an array/);
  });

  it("throws for a string", () => {
    expect(() => validateArray("[]", "x")).toThrow(/Expected x to be an array/);
  });

  it("throws for undefined", () => {
    expect(() => validateArray(undefined, "x")).toThrow(
      /Expected x to be an array/,
    );
  });
});

describe("validateObject", () => {
  it("returns the value when it is an object", () => {
    const obj = { a: 1 };
    expect(validateObject(obj, "x")).toBe(obj);
  });

  it("throws for null", () => {
    expect(() => validateObject(null, "x")).toThrow(
      /Expected x to be an object/,
    );
  });

  it("throws for a string", () => {
    expect(() => validateObject("hello", "x")).toThrow(
      /Expected x to be an object/,
    );
  });

  it("throws for undefined", () => {
    expect(() => validateObject(undefined, "x")).toThrow(
      /Expected x to be an object/,
    );
  });

  it("throws for a number", () => {
    expect(() => validateObject(42, "x")).toThrow(/Expected x to be an object/);
  });
});

describe("validateNumber", () => {
  it("returns the value when it is a number", () => {
    expect(validateNumber(42, "x")).toBe(42);
  });

  it("accepts zero", () => {
    expect(validateNumber(0, "x")).toBe(0);
  });

  it("accepts negative numbers", () => {
    expect(validateNumber(-5.5, "x")).toBe(-5.5);
  });

  it("accepts NaN (typeof NaN === 'number')", () => {
    expect(validateNumber(NaN, "x")).toBeNaN();
  });

  it("throws for a string", () => {
    expect(() => validateNumber("5", "x")).toThrow(/Expected x to be a number/);
  });

  it("throws for null", () => {
    expect(() => validateNumber(null, "x")).toThrow(
      /Expected x to be a number/,
    );
  });
});

// ── validateGPXResults ─────────────────────────────────────────────────────────

function validGPXResults() {
  return {
    trace: {
      points: [],
      peaks: [],
      valleys: [],
      slopes: [],
      cumulativeDistances: [],
      cumulativeElevations: [],
      cumulativeElevationLoss: [],
      totalDistance: 0,
      totalElevation: 0,
      totalElevationLoss: 0,
    },
    legs: [],
    sections: [],
    stages: [],
    waypoints: [],
    metadata: {},
    climbs: [],
  };
}

describe("validateGPXResults", () => {
  it("returns true for a complete valid result", () => {
    expect(validateGPXResults(validGPXResults())).toBe(true);
  });

  it("throws when results is null", () => {
    expect(() => validateGPXResults(null)).toThrow(
      "No results returned from worker",
    );
  });

  it("throws when results is undefined", () => {
    expect(() => validateGPXResults(undefined)).toThrow(
      "No results returned from worker",
    );
  });

  it("throws when trace is missing", () => {
    const r = validGPXResults();
    delete r.trace;
    expect(() => validateGPXResults(r)).toThrow(/results\.trace/);
  });

  it("throws when trace.points is not an array", () => {
    const r = validGPXResults();
    r.trace.points = null;
    expect(() => validateGPXResults(r)).toThrow(/trace\.points/);
  });

  it("throws when trace.peaks is not an array", () => {
    const r = validGPXResults();
    r.trace.peaks = "not-array";
    expect(() => validateGPXResults(r)).toThrow(/trace\.peaks/);
  });

  it("throws when trace.totalDistance is missing", () => {
    const r = validGPXResults();
    delete r.trace.totalDistance;
    expect(() => validateGPXResults(r)).toThrow(/trace\.totalDistance/);
  });

  it("throws when trace.totalDistance is a string", () => {
    const r = validGPXResults();
    r.trace.totalDistance = "100";
    expect(() => validateGPXResults(r)).toThrow(/trace\.totalDistance/);
  });

  it("throws when legs is not an array", () => {
    const r = validGPXResults();
    r.legs = null;
    expect(() => validateGPXResults(r)).toThrow(/results\.legs/);
  });

  it("throws when metadata is not an object", () => {
    const r = validGPXResults();
    r.metadata = null;
    expect(() => validateGPXResults(r)).toThrow(/results\.metadata/);
  });

  it("throws when climbs is not an array", () => {
    const r = validGPXResults();
    r.climbs = undefined;
    expect(() => validateGPXResults(r)).toThrow(/results\.climbs/);
  });
});

// ── validateGPSDataResults ─────────────────────────────────────────────────────

function validGPSDataResults() {
  return {
    points: [],
    slopes: [],
    cumulativeDistances: [],
    cumulativeElevations: [],
    cumulativeElevationLoss: [],
    totalDistance: 0,
    totalElevation: 0,
    totalElevationLoss: 0,
    pointCount: 0,
  };
}

describe("validateGPSDataResults", () => {
  it("returns true for a complete valid result", () => {
    expect(validateGPSDataResults(validGPSDataResults())).toBe(true);
  });

  it("throws when results is null", () => {
    expect(() => validateGPSDataResults(null)).toThrow(
      "No results returned from worker",
    );
  });

  it("throws when points is not an array", () => {
    const r = validGPSDataResults();
    r.points = {};
    expect(() => validateGPSDataResults(r)).toThrow(/results\.points/);
  });

  it("throws when totalDistance is not a number", () => {
    const r = validGPSDataResults();
    r.totalDistance = null;
    expect(() => validateGPSDataResults(r)).toThrow(/results\.totalDistance/);
  });

  it("throws when pointCount is not a number", () => {
    const r = validGPSDataResults();
    r.pointCount = "5";
    expect(() => validateGPSDataResults(r)).toThrow(/results\.pointCount/);
  });

  it("throws when cumulativeElevationLoss is missing", () => {
    const r = validGPSDataResults();
    delete r.cumulativeElevationLoss;
    expect(() => validateGPSDataResults(r)).toThrow(
      /results\.cumulativeElevationLoss/,
    );
  });
});

// ── validateSectionsResults ────────────────────────────────────────────────────

function validSectionsResults() {
  const arr = [{ id: 1 }];
  arr.totalDistance = 1000;
  arr.totalElevationGain = 50;
  arr.totalElevationLoss = 30;
  arr.pointCount = 100;
  return arr;
}

describe("validateSectionsResults", () => {
  it("returns true for a valid sections array with summary properties", () => {
    expect(validateSectionsResults(validSectionsResults())).toBe(true);
  });

  it("throws when results is null", () => {
    expect(() => validateSectionsResults(null)).toThrow(
      "No results returned from worker",
    );
  });

  it("throws when results is a plain object (not array)", () => {
    const r = {
      totalDistance: 0,
      totalElevationGain: 0,
      totalElevationLoss: 0,
      pointCount: 0,
    };
    expect(() => validateSectionsResults(r)).toThrow(/results/);
  });

  it("throws when totalDistance is not a number", () => {
    const r = validSectionsResults();
    r.totalDistance = "1000";
    expect(() => validateSectionsResults(r)).toThrow(/results\.totalDistance/);
  });

  it("throws when totalElevationGain is missing", () => {
    const r = validSectionsResults();
    delete r.totalElevationGain;
    expect(() => validateSectionsResults(r)).toThrow(
      /results\.totalElevationGain/,
    );
  });

  it("throws when pointCount is not a number", () => {
    const r = validSectionsResults();
    r.pointCount = null;
    expect(() => validateSectionsResults(r)).toThrow(/results\.pointCount/);
  });
});

// ── validateRouteStatsResults ──────────────────────────────────────────────────

function validRouteStatsResults() {
  return { distance: 0, elevationGain: 0, elevationLoss: 0, pointCount: 0 };
}

describe("validateRouteStatsResults", () => {
  it("returns true for a valid result", () => {
    expect(validateRouteStatsResults(validRouteStatsResults())).toBe(true);
  });

  it("throws when results is null", () => {
    expect(() => validateRouteStatsResults(null)).toThrow(
      "No results returned from worker",
    );
  });

  it("throws when distance is not a number", () => {
    const r = validRouteStatsResults();
    r.distance = null;
    expect(() => validateRouteStatsResults(r)).toThrow(/results\.distance/);
  });

  it("throws when elevationGain is a string", () => {
    const r = validRouteStatsResults();
    r.elevationGain = "50";
    expect(() => validateRouteStatsResults(r)).toThrow(
      /results\.elevationGain/,
    );
  });

  it("throws when elevationLoss is missing", () => {
    const r = validRouteStatsResults();
    delete r.elevationLoss;
    expect(() => validateRouteStatsResults(r)).toThrow(
      /results\.elevationLoss/,
    );
  });

  it("throws when pointCount is missing", () => {
    const r = validRouteStatsResults();
    delete r.pointCount;
    expect(() => validateRouteStatsResults(r)).toThrow(/results\.pointCount/);
  });
});

// ── validatePointsAtDistancesResults ──────────────────────────────────────────

describe("validatePointsAtDistancesResults", () => {
  it("returns true for a valid result", () => {
    expect(validatePointsAtDistancesResults({ points: [] })).toBe(true);
  });

  it("throws when results is null", () => {
    expect(() => validatePointsAtDistancesResults(null)).toThrow(
      "No results returned from worker",
    );
  });

  it("throws when results is not an object", () => {
    expect(() => validatePointsAtDistancesResults([])).toThrow(/results/);
  });

  it("throws when points is not an array", () => {
    expect(() => validatePointsAtDistancesResults({ points: null })).toThrow(
      /results\.points/,
    );
  });

  it("throws when points is a string", () => {
    expect(() => validatePointsAtDistancesResults({ points: "[]" })).toThrow(
      /results\.points/,
    );
  });
});

// ── validateRouteSectionResults ────────────────────────────────────────────────

describe("validateRouteSectionResults", () => {
  it("returns true when section is an array and distance is absent", () => {
    expect(validateRouteSectionResults({ section: [] })).toBe(true);
  });

  it("returns true when distance is a valid number", () => {
    expect(validateRouteSectionResults({ section: [], distance: 500 })).toBe(
      true,
    );
  });

  it("returns true when distance is zero", () => {
    expect(validateRouteSectionResults({ section: [], distance: 0 })).toBe(
      true,
    );
  });

  it("throws when results is null", () => {
    expect(() => validateRouteSectionResults(null)).toThrow(
      "No results returned from worker",
    );
  });

  it("throws when results is not an object", () => {
    expect(() => validateRouteSectionResults("invalid")).toThrow(/results/);
  });

  it("throws when section is not an array", () => {
    expect(() => validateRouteSectionResults({ section: null })).toThrow(
      /results\.section/,
    );
  });

  it("throws when distance is provided but is a string", () => {
    expect(() =>
      validateRouteSectionResults({ section: [], distance: "500" }),
    ).toThrow(/results\.distance/);
  });

  it("throws when distance is provided but is null", () => {
    expect(() =>
      validateRouteSectionResults({ section: [], distance: null }),
    ).toThrow(/results\.distance/);
  });

  it("throws when distance is NaN (invalid WASM output)", () => {
    expect(() =>
      validateRouteSectionResults({ section: [], distance: NaN }),
    ).toThrow(/results\.distance/);
  });

  it("throws when distance is Infinity", () => {
    expect(() =>
      validateRouteSectionResults({ section: [], distance: Infinity }),
    ).toThrow(/results\.distance/);
  });
});
