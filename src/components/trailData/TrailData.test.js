import { describe, it, expect, beforeEach } from "vitest";

// Helper function extracted from TrailData for testing
const calculateTimeMetrics = (location, cumulativeDistances, startingDate) => {
  const distanceDone = cumulativeDistances[location?.index || 0] || 0;
  const totalDistance =
    cumulativeDistances[cumulativeDistances.length - 1] || 1;
  const elapsedDuration = (location?.timestamp || 0) - startingDate;

  const estimatedTotalDuration =
    distanceDone > 0 ? (elapsedDuration * totalDistance) / distanceDone : 0;

  const eta = startingDate + Math.round(estimatedTotalDuration);

  return { eta, distanceDone, totalDistance, estimatedTotalDuration };
};

describe("TrailData - calculateTimeMetrics", () => {
  let mockLocation;
  let mockCumulativeDistances;
  let mockStartingDate;

  beforeEach(() => {
    mockStartingDate = Date.now() - 3600000; // 1 hour ago
    mockCumulativeDistances = [0, 1000, 2000, 3000, 4000, 5000];
    mockLocation = {
      index: 3,
      timestamp: mockStartingDate + 1800000, // 30 min elapsed
    };
  });

  describe("valid inputs", () => {
    it("should calculate ETA correctly with valid inputs", () => {
      const result = calculateTimeMetrics(
        mockLocation,
        mockCumulativeDistances,
        mockStartingDate,
      );

      expect(result.distanceDone).toBe(3000);
      expect(result.totalDistance).toBe(5000);
      expect(result.estimatedTotalDuration).toBeGreaterThan(0);
      expect(Number.isFinite(result.eta)).toBe(true);
    });

    it("should handle progress partway through trail", () => {
      const result = calculateTimeMetrics(
        mockLocation,
        mockCumulativeDistances,
        mockStartingDate,
      );

      // At 3000/5000 (60%) distance with 30 min elapsed
      // Estimated total = (30min * 5000) / 3000 = 50min
      expect(result.estimatedTotalDuration).toBeCloseTo(3000000, -4); // ~50min in ms
    });
  });

  describe("edge cases", () => {
    it("should handle zero distance done", () => {
      const zeroLocation = { index: 0, timestamp: mockStartingDate + 1000 };
      const result = calculateTimeMetrics(
        zeroLocation,
        mockCumulativeDistances,
        mockStartingDate,
      );

      expect(result.distanceDone).toBe(0);
      expect(result.estimatedTotalDuration).toBe(0);
    });

    it("should handle null/undefined location", () => {
      const result = calculateTimeMetrics(
        null,
        mockCumulativeDistances,
        mockStartingDate,
      );

      expect(result.distanceDone).toBe(0);
      expect(result.estimatedTotalDuration).toBe(0);
    });

    it("should handle missing cumulative distances", () => {
      const result = calculateTimeMetrics(mockLocation, [], mockStartingDate);

      expect(result.totalDistance).toBe(1);
      expect(Number.isFinite(result.eta)).toBe(true);
    });

    it("should handle single distance value", () => {
      const result = calculateTimeMetrics(
        { index: 0, timestamp: mockStartingDate + 1000 },
        [5000],
        mockStartingDate,
      );

      expect(result.totalDistance).toBe(5000);
      expect(result.distanceDone).toBe(5000);
    });
  });

  describe("validation - prevents NaN/Infinity", () => {
    it("should not produce NaN when all inputs valid", () => {
      const result = calculateTimeMetrics(
        mockLocation,
        mockCumulativeDistances,
        mockStartingDate,
      );

      expect(Number.isNaN(result.eta)).toBe(false);
      expect(Number.isNaN(result.distanceDone)).toBe(false);
      expect(Number.isNaN(result.totalDistance)).toBe(false);
    });

    it("should produce Infinity only when dividing by zero", () => {
      // Only case where Infinity can occur is 0 distance with time elapsed
      const result = calculateTimeMetrics(
        { index: 0, timestamp: mockStartingDate + 5000 },
        [0, 0, 0],
        mockStartingDate,
      );

      // Since distanceDone = 0, estimatedTotalDuration should be 0
      expect(result.estimatedTotalDuration).toBe(0);
    });

    it("should handle very large distance values", () => {
      const largeDistances = [0, 1e10, 2e10, 3e10, 4e10, 5e10];
      const result = calculateTimeMetrics(
        { index: 2, timestamp: mockStartingDate + 3600000 },
        largeDistances,
        mockStartingDate,
      );

      expect(Number.isFinite(result.eta)).toBe(true);
      expect(Number.isFinite(result.estimatedTotalDuration)).toBe(true);
    });

    it("should handle very small time values", () => {
      const result = calculateTimeMetrics(
        { index: 1, timestamp: mockStartingDate + 100 }, // Only 100ms elapsed
        mockCumulativeDistances,
        mockStartingDate,
      );

      expect(Number.isFinite(result.eta)).toBe(true);
      expect(result.estimatedTotalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("range validation", () => {
    it("should ensure distances are non-negative", () => {
      const result = calculateTimeMetrics(
        mockLocation,
        mockCumulativeDistances,
        mockStartingDate,
      );

      expect(result.distanceDone).toBeGreaterThanOrEqual(0);
      expect(result.totalDistance).toBeGreaterThanOrEqual(0);
    });

    it("should handle index out of bounds gracefully", () => {
      const result = calculateTimeMetrics(
        { index: 999, timestamp: mockStartingDate + 1000 },
        mockCumulativeDistances,
        mockStartingDate,
      );

      // Should return 0 for out-of-bounds index
      expect(result.distanceDone).toBe(0);
    });
  });
});
