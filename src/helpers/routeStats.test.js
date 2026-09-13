import { describe, expect, it } from "vitest";

import {
  computeRouteStats,
  computeRunnabilityDistribution,
  computeUphillGradientDistribution,
} from "./routeStats.js";

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

  it("routes a segment to walkTimeS once its paceFactor crosses the hike-only cutoff", () => {
    // One easy km (paceFactor 1, runnable) then one brutal km (paceFactor
    // 2.5, matches RunnabilityIndex's "Hike-only" band) — the two segments
    // must land in different buckets, not both count as run.
    const cumulativeDistances = [0, 1000, 2000];
    const slopes = [0, 0, 25];
    const paceFactors = [1, 1, 2.5];

    const stats = computeRouteStats({
      slopes,
      paceFactors,
      cumulativeDistances,
      runBasePaceSPerKm: 490,
    });

    expect(stats.runTimeS).toBeGreaterThan(0);
    expect(stats.walkTimeS).toBeGreaterThan(0);
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

  it("scales both the run and walk estimates with the selected runner profile's pace", () => {
    const cumulativeDistances = [0, 1000, 2000];
    // one runnable km, one hike-only km
    const slopes = [0, 0, 25];
    const paceFactors = [1, 1, 2.5];

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
    // walk pace is derived from the run profile (a fixed offset), so a
    // faster runner also gets a faster hike-only estimate — not a shared,
    // profile-independent constant like before.
    expect(eliteStats.walkTimeS).toBeLessThan(casualStats.walkTimeS);
  });
});

describe("computeRunnabilityDistribution", () => {
  it("returns null when inputs are empty", () => {
    expect(
      computeRunnabilityDistribution({
        paceFactors: [],
        cumulativeDistances: [],
      }),
    ).toBeNull();
  });

  it("buckets distance into the matching runnability band", () => {
    const cumulativeDistances = [0, 1000, 2000, 3000];
    const paceFactors = [1, 1, 1.8, 2.5];

    const distribution = computeRunnabilityDistribution({
      paceFactors,
      cumulativeDistances,
    });

    const byLabel = Object.fromEntries(
      distribution.map((b) => [b.label, b.distanceM]),
    );
    expect(byLabel["Runnable"]).toBe(1000);
    expect(byLabel["Marginal"]).toBe(1000);
    expect(byLabel["Hike-only"]).toBe(1000);
  });

  it("skips segments with a non-positive distance instead of corrupting totals", () => {
    const cumulativeDistances = [0, 1000, 900, 1900];
    const paceFactors = [1, 1, 1, 1];

    const distribution = computeRunnabilityDistribution({
      paceFactors,
      cumulativeDistances,
    });

    expect(distribution.find((b) => b.label === "Runnable").distanceM).toBe(
      2000,
    );
  });
});

describe("computeUphillGradientDistribution", () => {
  it("returns null when inputs are empty", () => {
    expect(
      computeUphillGradientDistribution({
        slopes: [],
        cumulativeDistances: [],
      }),
    ).toBeNull();
  });

  it("buckets uphill distance into the matching gradient band", () => {
    const cumulativeDistances = [0, 100, 200];
    const slopes = [0, 3, 12];

    const distribution = computeUphillGradientDistribution({
      slopes,
      cumulativeDistances,
    });

    const byLabel = Object.fromEntries(
      distribution.map((b) => [b.label, b.distanceM]),
    );
    expect(byLabel["2–5%"]).toBe(100);
    expect(byLabel["10–15%"]).toBe(100);
    expect(byLabel["5–10%"]).toBe(0);
  });

  it("excludes flat and downhill segments", () => {
    const cumulativeDistances = [0, 100, 200, 300];
    const slopes = [0, 1, -10, 12];

    const distribution = computeUphillGradientDistribution({
      slopes,
      cumulativeDistances,
    });

    const totalDist = distribution.reduce((sum, b) => sum + b.distanceM, 0);
    expect(totalDist).toBe(100);
  });

  it("skips segments with a non-positive distance instead of corrupting totals", () => {
    const cumulativeDistances = [0, 100, 90, 190];
    const slopes = [0, 7, 7, 7];

    const distribution = computeUphillGradientDistribution({
      slopes,
      cumulativeDistances,
    });

    // Only the 0->100 and 90->190 segments count: 100m + 100m = 200m total.
    expect(distribution.find((b) => b.label === "5–10%").distanceM).toBe(200);
  });
});
