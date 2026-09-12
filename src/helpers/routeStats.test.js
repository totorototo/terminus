import { describe, expect, it } from "vitest";

import { computeRouteStats } from "./routeStats.js";

describe("computeRouteStats", () => {
  it("returns null when inputs are empty", () => {
    expect(
      computeRouteStats({
        slopes: [],
        paceFactors: [],
        cumulativeDistances: [],
        runBasePaceSPerKm: 490,
      }),
    ).toBeNull();
  });

  it("splits distance into uphill/flat/downhill and averages gradients", () => {
    // 4 segments of 100m each: flat, +10% uphill, -1% (still flat), -20% downhill
    const cumulativeDistances = [0, 100, 200, 300, 400];
    const slopes = [0, 0, 10, -1, -20];
    const paceFactors = [1, 1, 1, 1, 1];

    const stats = computeRouteStats({
      slopes,
      paceFactors,
      cumulativeDistances,
      runBasePaceSPerKm: 490,
    });

    expect(stats.terrainBreakdown.uphillPct).toBeCloseTo(25, 5);
    expect(stats.terrainBreakdown.flatPct).toBeCloseTo(50, 5);
    expect(stats.terrainBreakdown.downhillPct).toBeCloseTo(25, 5);
    expect(stats.avgUphillGradePct).toBeCloseTo(10, 5);
    expect(stats.avgDownhillGradePct).toBeCloseTo(-20, 5);
  });

  it("buckets uphill distance into the matching gradient band", () => {
    const cumulativeDistances = [0, 100, 200];
    const slopes = [0, 3, 12];
    const paceFactors = [1, 1, 1];

    const stats = computeRouteStats({
      slopes,
      paceFactors,
      cumulativeDistances,
      runBasePaceSPerKm: 490,
    });

    const byLabel = Object.fromEntries(
      stats.uphillGradientDistribution.map((b) => [b.label, b.distanceM]),
    );
    expect(byLabel["2–5%"]).toBe(100);
    expect(byLabel["10–15%"]).toBe(100);
    expect(byLabel["5–10%"]).toBe(0);
  });

  it("weights walk/run time by paceFactor, walking slower than running on the same terrain", () => {
    const cumulativeDistances = [0, 1000];
    const slopes = [0, 0];
    const paceFactors = [1, 1];

    const stats = computeRouteStats({
      slopes,
      paceFactors,
      cumulativeDistances,
      runBasePaceSPerKm: 490,
    });

    expect(stats.walkTimeS).toBeGreaterThan(stats.runTimeS);
  });

  it("returns null for a single-point route (nothing to sum)", () => {
    expect(
      computeRouteStats({
        slopes: [0],
        paceFactors: [1],
        cumulativeDistances: [0],
        runBasePaceSPerKm: 490,
      }),
    ).toBeNull();
  });

  it("stays within the shortest array when inputs are mismatched in length", () => {
    // cumulativeDistances is one point ahead of slopes/paceFactors, as can
    // happen mid-recalibration — should use the 3 aligned points, not crash.
    const stats = computeRouteStats({
      slopes: [0, 10, 20],
      paceFactors: [1, 1, 1],
      cumulativeDistances: [0, 100, 200, 300],
      runBasePaceSPerKm: 490,
    });

    expect(stats).not.toBeNull();
    expect(stats.terrainBreakdown.uphillPct).toBeCloseTo(100, 5);
  });

  it("skips segments with a non-positive distance instead of corrupting totals", () => {
    // Third point regresses (e.g. a GPS glitch) — that segment must be ignored.
    const cumulativeDistances = [0, 100, 90, 190];
    const slopes = [0, 7, 7, 7];
    const paceFactors = [1, 1, 1, 1];

    const stats = computeRouteStats({
      slopes,
      paceFactors,
      cumulativeDistances,
      runBasePaceSPerKm: 490,
    });

    // Only the 0->100 and 90->190 segments count: 100m + 100m = 200m total.
    expect(stats.terrainBreakdown.uphillPct).toBeCloseTo(100, 5);
    expect(
      stats.uphillGradientDistribution.find((b) => b.label === "5–10%")
        .distanceM,
    ).toBe(200);
  });

  it("returns 0 (not NaN) for avg gradients on an all-flat route", () => {
    const stats = computeRouteStats({
      slopes: [0, 0, 1, -1],
      paceFactors: [1, 1, 1, 1],
      cumulativeDistances: [0, 100, 200, 300],
      runBasePaceSPerKm: 490,
    });

    expect(stats.avgUphillGradePct).toBe(0);
    expect(stats.avgDownhillGradePct).toBe(0);
    expect(stats.terrainBreakdown.flatPct).toBeCloseTo(100, 5);
  });

  it("scales the run estimate with the selected runner profile's pace", () => {
    const cumulativeDistances = [0, 1000];
    const slopes = [0, 0];
    const paceFactors = [1, 1];

    const eliteStats = computeRouteStats({
      slopes,
      paceFactors,
      cumulativeDistances,
      runBasePaceSPerKm: 300, // Elite preset
    });
    const casualStats = computeRouteStats({
      slopes,
      paceFactors,
      cumulativeDistances,
      runBasePaceSPerKm: 600, // Casual preset
    });

    expect(eliteStats.runTimeS).toBeLessThan(casualStats.runTimeS);
    // walk estimate is independent of the runner profile
    expect(eliteStats.walkTimeS).toBe(casualStats.walkTimeS);
  });
});
