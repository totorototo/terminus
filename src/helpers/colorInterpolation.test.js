import { describe, expect, it } from "vitest";

import {
  getInterpolatedColor,
  interpolateColor,
} from "./colorInterpolation.js";

describe("colorInterpolation test suite", () => {
  describe("interpolateColor", () => {
    it("should return first color when t=0", () => {
      const result = interpolateColor(0, "#ff0000", "#0000ff", 1.0);
      expect(result).toBe("rgb(255, 0, 0)");
    });

    it("should return second color when t=1", () => {
      const result = interpolateColor(1, "#ff0000", "#0000ff", 1.0);
      expect(result).toBe("rgb(0, 0, 255)");
    });

    it("should interpolate midpoint between two colors", () => {
      const result = interpolateColor(0.5, "#ff0000", "#0000ff", 1.0);
      expect(result).toBe("rgb(128, 0, 128)");
    });

    it("should apply brightness factor correctly", () => {
      const result = interpolateColor(0, "#808080", "#808080", 1.5);
      // 128 * 1.5 = 192
      expect(result).toBe("rgb(192, 192, 192)");
    });

    it("should clamp values at 255 when brightening", () => {
      const result = interpolateColor(0, "#ffffff", "#ffffff", 2.0);
      expect(result).toBe("rgb(255, 255, 255)");
    });

    it("should handle black color", () => {
      const result = interpolateColor(0, "#000000", "#000000", 1.0);
      expect(result).toBe("rgb(0, 0, 0)");
    });

    it("should use default brighten factor of 1.3", () => {
      const result = interpolateColor(0, "#646464", "#646464");
      // 100 * 1.3 = 130
      expect(result).toBe("rgb(130, 130, 130)");
    });
  });

  describe("getInterpolatedColor", () => {
    const colors = ["#ff0000", "#00ff00", "#0000ff"]; // Red, Green, Blue

    it("should return first color when total is 1", () => {
      const result = getInterpolatedColor(0, 1, colors, 1.0);
      expect(result).toBe("#ff0000");
    });

    it("should return first color for index 0", () => {
      const result = getInterpolatedColor(0, 3, colors, 1.0);
      expect(result).toBe("rgb(255, 0, 0)");
    });

    it("should return last color for last index", () => {
      const result = getInterpolatedColor(2, 3, colors, 1.0);
      expect(result).toBe("rgb(0, 0, 255)");
    });

    it("should interpolate between first and second color at midpoint", () => {
      const result = getInterpolatedColor(1, 3, colors, 1.0);
      expect(result).toBe("rgb(0, 255, 0)");
    });

    it("should handle two colors array", () => {
      const twoColors = ["#000000", "#ffffff"];
      const result = getInterpolatedColor(0, 2, twoColors, 1.0);
      expect(result).toBe("rgb(0, 0, 0)");
    });

    it("should handle single color in array when total > 1", () => {
      const singleColor = ["#ff0000"];
      const result = getInterpolatedColor(2, 5, singleColor, 1.0);
      expect(result).toBe("rgb(255, 0, 0)");
    });

    it("should apply brighten factor to interpolated colors", () => {
      const result = getInterpolatedColor(0, 2, ["#808080", "#808080"], 1.5);
      // 128 * 1.5 = 192
      expect(result).toBe("rgb(192, 192, 192)");
    });

    it("should use default brighten factor of 1.3", () => {
      const result = getInterpolatedColor(0, 2, ["#646464", "#646464"]);
      // 100 * 1.3 = 130
      expect(result).toBe("rgb(130, 130, 130)");
    });

    it("should handle fractional segment interpolation", () => {
      // With 5 total items and 3 colors, index 1 should be 50% through first segment
      const result = getInterpolatedColor(1, 5, colors, 1.0);
      // segment = (1 / 4) * 2 = 0.5
      // segmentIndex = 0, t = 0.5
      // Interpolating between red (#ff0000) and green (#00ff00) at t=0.5
      // r: 255 + (0-255)*0.5 = 127.5 -> 128
      // g: 0 + (255-0)*0.5 = 127.5 -> 128
      // b: 0 + (0-0)*0.5 = 0
      expect(result).toBe("rgb(128, 128, 0)");
    });
  });
});
