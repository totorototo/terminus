import { describe, it, expect, beforeEach } from "vitest";
import {
  transformCoordinate,
  transformCoordinates,
  transformSections,
  createCheckpoints,
  createCoordinateScales,
} from "./coordinateTransforms";

describe("coordinateTransforms test suite", () => {
  describe("createCoordinateScales", () => {
    it("should create coordinate scales with valid coordinates", () => {
      const coordinates = [
        [0, 0, 100], // [longitude, latitude, elevation]
        [1, 1, 200],
        [2, 2, 150],
      ];
      const scales = createCoordinateScales(coordinates);

      expect(scales).toBeDefined();
      expect(scales.xScale).toBeDefined();
      expect(scales.yScale).toBeDefined();
      expect(scales.zScale).toBeDefined();
      expect(scales.extents).toBeDefined();
      expect(scales.extents.longitude).toHaveLength(2);
      expect(scales.extents.elevation).toHaveLength(2);
      expect(scales.extents.latitude).toHaveLength(2);
    });

    it("should handle empty coordinates array", () => {
      const scales = createCoordinateScales([]);

      expect(scales).toBeDefined();
      expect(scales.xScale).toBeDefined();
      expect(scales.yScale).toBeDefined();
      expect(scales.zScale).toBeDefined();
    });

    it("should apply custom options", () => {
      const coordinates = [
        [0, 0, 100],
        [1, 1, 200],
      ];
      const options = {
        xRange: [-5, 5],
        yRange: [0, 2],
        zRange: [10, -10],
        padding: 0.2,
        normalizeElevation: false,
      };
      const scales = createCoordinateScales(coordinates, options);

      expect(scales).toBeDefined();
      expect(scales.xScale.range()).toEqual([-5, 5]);
      expect(scales.yScale.range()).toEqual([0, 2]);
      expect(scales.zScale.range()).toEqual([10, -10]);
    });
  });

  describe("transformCoordinate", () => {
    it("should transform a single coordinate correctly", () => {
      const coordinates = [
        [0, 0, 100],
        [10, 10, 200],
      ];
      const scales = createCoordinateScales(coordinates);
      const coord = [5, 5, 150]; // [longitude, latitude, elevation]

      const result = transformCoordinate(coord, scales);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });
  });

  describe("transformCoordinates", () => {
    it("should transform multiple coordinates correctly", () => {
      const coordinates = [
        [0, 0, 100],
        [5, 5, 150],
        [10, 10, 200],
      ];
      const scales = createCoordinateScales(coordinates);

      const result = transformCoordinates(coordinates, scales);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      result.forEach((coord) => {
        expect(coord).toHaveLength(3);
      });
    });
  });

  describe("createCheckpoints", () => {
    it("should create checkpoints from sections", () => {
      const coordinates = [
        [0, 0, 100],
        [10, 10, 200],
      ];
      const scales = createCoordinateScales(coordinates);
      const sections = [
        {
          startPoint: [0, 0, 100],
          endPoint: [10, 10, 200],
          startLocation: "Start",
          endLocation: "End",
          startIndex: 0,
          endIndex: 1,
        },
      ];

      const result = createCheckpoints(sections, scales);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((checkpoint) => {
        expect(checkpoint.name).toBeDefined();
        expect(checkpoint.point3D).toBeDefined();
        expect(checkpoint.index).toBeDefined();
      });
    });

    it("should handle empty sections", () => {
      const coordinates = [[0, 0, 100]];
      const scales = createCoordinateScales(coordinates);

      const result = createCheckpoints([], scales);

      expect(result).toEqual([]);
    });
  });

  describe("transformSections", () => {
    it("should transform sections correctly", () => {
      const coordinates = [
        [0, 0, 100],
        [5, 5, 150],
        [10, 10, 200],
      ];
      const scales = createCoordinateScales(coordinates);
      const sections = [
        {
          points: coordinates,
          totalDistance: 1000,
          totalElevation: 100,
          totalElevationLoss: 50,
          startPoint: [0, 0, 100],
          segmentId: "segment-1",
        },
      ];

      const result = transformSections(sections, scales);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].points).toBeDefined();
      expect(result[0].totalDistance).toBe(1000);
      expect(result[0].totalElevation).toBe(100);
      expect(result[0].totalElevationLoss).toBe(50);
      expect(result[0].id).toBe("segment-1");
    });

    it("should handle empty sections", () => {
      const coordinates = [[0, 0, 100]];
      const scales = createCoordinateScales(coordinates);

      const result = transformSections([], scales);

      expect(result).toEqual([]);
    });
  });
});
