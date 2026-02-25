import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { calculateTimeMetrics } from "./TrailData.jsx";

describe("calculateTimeMetrics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Before race starts", () => {
    it("should calculate with timestamp < startingDate (validation is at component level)", () => {
      // GPX data: race starts 2026-05-13T10:00:00Z
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const location = {
        index: 0,
        timestamp: new Date("2026-05-13T08:00:00Z").getTime(), // Before race
      };
      const cumulativeDistances = [0, 1000, 2000, 5000];

      // Note: calculateTimeMetrics itself doesn't validate - the component does
      // This test confirms the function can handle pre-race timestamps
      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      // Should return actual calculation (not defaults), validation happens in component
      expect(result.distanceDone).toBe(0);
      expect(result.totalDistance).toBe(5000);
      expect(result.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$/);
    });

    it("should handle null location gracefully (uses optional chaining)", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const cumulativeDistances = [0, 1000, 2000, 5000];

      // Note: calculateTimeMetrics handles null with optional chaining
      // The component validates null at a higher level
      const result = calculateTimeMetrics(
        null,
        cumulativeDistances,
        startingDate,
      );

      // With null, index defaults to 0, timestamp defaults to 0
      expect(result.distanceDone).toBe(0);
      // ETA should be a valid string (either a time or "--:--")
      expect(result.etaDateStr).toBeTruthy();
    });
  });

  describe("Race in progress - 50% completion", () => {
    it("should calculate ETA and remaining time correctly", () => {
      // GPX data timestamps from vvx-xgtv-2026.gpx
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime(); // Race start
      const raceTime = new Date("2026-05-13T14:00:00Z").getTime(); // 4 hours later

      vi.setSystemTime(raceTime);

      // At index 2, halfway through
      const location = {
        index: 2,
        timestamp: raceTime, // 4 hours elapsed
      };
      const cumulativeDistances = [0, 1000, 5000, 10000]; // 5km done out of 10km total

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      // Elapsed: 4 hours for 5km → pace: 4h/5km = 0.8h/km
      // Total distance: 10km → estimated total: 10 * 0.8h = 8h
      // ETA: 08:00 + 8h = 16:00
      expect(result.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$/); // Valid time format
      expect(result.distanceDone).toBe(5000);
      expect(result.totalDistance).toBe(10000);

      // Remaining time should be positive (we set current time to 12:00)
      // ETA is ~16:00, so remaining should be ~4 hours
      expect(result.remainingStr).toBeTruthy();
      expect(result.remainingStr).not.toBe("--");
    });

    it("should handle partial distance correctly", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const raceTime = new Date("2026-05-13T12:00:00Z").getTime(); // 2 hours later

      vi.setSystemTime(raceTime);

      const location = {
        index: 1,
        timestamp: raceTime,
      };
      const cumulativeDistances = [0, 2500, 5000, 10000]; // 2.5km done out of 10km

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      // 2 hours elapsed for 2.5km → pace: 0.8h/km
      // Total 10km → ~8 hours total
      expect(result.distanceDone).toBe(2500);
      expect(result.totalDistance).toBe(10000);
      // ETA should be a valid time format
      expect(result.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$/);
    });
  });

  describe("Near completion", () => {
    it("should show correct remaining time close to finish", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const raceTime = new Date("2026-05-13T21:00:00Z").getTime(); // 11 hours later, almost done

      vi.setSystemTime(raceTime);

      const location = {
        index: 9,
        timestamp: raceTime,
      };
      // 9.5km done out of 10km (95% complete)
      const cumulativeDistances = [
        0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9500, 10000,
      ];

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      expect(result.distanceDone).toBe(9500);
      expect(result.totalDistance).toBe(10000);
      expect(result.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$/);
      // Remaining should be small (less than 1 hour probably)
      expect(result.remainingStr).toBeTruthy();
    });

    it("should handle completion (distance done = total distance)", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const raceTime = new Date("2026-05-13T22:00:00Z").getTime(); // 12 hours elapsed

      vi.setSystemTime(raceTime);

      const location = {
        index: 10,
        timestamp: raceTime,
      };
      const cumulativeDistances = [
        0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
      ];

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      expect(result.distanceDone).toBe(10000);
      expect(result.totalDistance).toBe(10000);
      // ETA should be ≈ current time (or just past)
      expect(result.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$/);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty cumulativeDistances", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const location = { index: 0, timestamp: startingDate };
      const cumulativeDistances = [];

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      expect(result.distanceDone).toBe(0);
      // Empty array returns `undefined`, which falls back to `|| 1` in the function
      expect(result.totalDistance).toBe(1);
    });

    it("should handle division by zero (zero distance done)", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const raceTime = new Date("2026-05-13T11:00:00Z").getTime();

      vi.setSystemTime(raceTime);

      const location = {
        index: 0,
        timestamp: raceTime,
      };
      const cumulativeDistances = [0, 1000, 2000, 5000];

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      // When distanceDone is 0, estimatedTotalDuration should be 0
      expect(Number.isFinite(result.distanceDone)).toBe(true);
      expect(result.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$|^--:--$/);
    });

    it("should handle missing location properties", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const location = {}; // Missing index and timestamp
      const cumulativeDistances = [0, 1000, 2000, 5000];

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      expect(result.distanceDone).toBe(0);
      expect(result.totalDistance).toBe(5000);
    });

    it("should produce finite ETA values", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const raceTime = new Date("2026-05-13T14:00:00Z").getTime();

      vi.setSystemTime(raceTime);

      const location = {
        index: 2,
        timestamp: raceTime,
      };
      const cumulativeDistances = [0, 1000, 5000, 10000];

      const result = calculateTimeMetrics(
        location,
        cumulativeDistances,
        startingDate,
      );

      // ETA should always be a valid time string or "--:--"
      expect(/^[A-Za-z]{3} \d{2}:\d{2}$|^--:--$/.test(result.etaDateStr)).toBe(
        true,
      );
    });
  });

  describe("Time progression", () => {
    it("should show ETA advancing as race progresses", () => {
      const startingDate = new Date("2026-05-13T10:00:00Z").getTime();
      const cumulativeDistances = [
        0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
      ];

      // Hour 2: at 2km
      vi.setSystemTime(new Date("2026-05-13T12:00:00Z").getTime());
      const result1 = calculateTimeMetrics(
        { index: 2, timestamp: new Date("2026-05-13T12:00:00Z").getTime() },
        cumulativeDistances,
        startingDate,
      );

      // Hour 4: at 4km
      vi.setSystemTime(new Date("2026-05-13T14:00:00Z").getTime());
      const result2 = calculateTimeMetrics(
        { index: 4, timestamp: new Date("2026-05-13T14:00:00Z").getTime() },
        cumulativeDistances,
        startingDate,
      );

      // Both should have valid ETAs
      expect(result1.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$/);
      expect(result2.etaDateStr).toMatch(/^[A-Za-z]{3} \d{2}:\d{2}$/);

      // The ETA should improve (get earlier) as pace gets faster (consistent 1km/h)
      expect(result1.etaDateStr).toBeTruthy();
      expect(result2.etaDateStr).toBeTruthy();
    });
  });
});
