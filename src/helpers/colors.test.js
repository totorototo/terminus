import { describe, expect, it } from "vitest";

import { hexToRgb } from "./colors.js";

describe("hexToRgb", () => {
  describe("valid hex colors with hash prefix", () => {
    it("converts white (#ffffff) to [1, 1, 1]", () => {
      expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
    });

    it("converts black (#000000) to [0, 0, 0]", () => {
      expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    });

    it("converts pure red (#ff0000) to [1, 0, 0]", () => {
      expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    });

    it("converts pure green (#00ff00) to [0, 1, 0]", () => {
      expect(hexToRgb("#00ff00")).toEqual([0, 1, 0]);
    });

    it("converts pure blue (#0000ff) to [0, 0, 1]", () => {
      expect(hexToRgb("#0000ff")).toEqual([0, 0, 1]);
    });

    it("converts a mid-grey (#808080) to approximately 0.502 each channel", () => {
      const [r, g, b] = hexToRgb("#808080");
      expect(r).toBeCloseTo(0x80 / 255);
      expect(g).toBeCloseTo(0x80 / 255);
      expect(b).toBeCloseTo(0x80 / 255);
    });

    it("converts an arbitrary colour (#1a2b3c) correctly", () => {
      expect(hexToRgb("#1a2b3c")).toEqual([0x1a / 255, 0x2b / 255, 0x3c / 255]);
    });

    it("is case-insensitive (#AABBCC)", () => {
      expect(hexToRgb("#AABBCC")).toEqual([0xaa / 255, 0xbb / 255, 0xcc / 255]);
    });
  });

  describe("valid hex colors without hash prefix", () => {
    it("converts white (ffffff) without hash to [1, 1, 1]", () => {
      expect(hexToRgb("ffffff")).toEqual([1, 1, 1]);
    });

    it("converts black (000000) without hash to [0, 0, 0]", () => {
      expect(hexToRgb("000000")).toEqual([0, 0, 0]);
    });
  });

  describe("output range", () => {
    const samples = [
      "#000000",
      "#ffffff",
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#7f7f7f",
      "#123456",
      "#abcdef",
      "#fedcba",
    ];

    it.each(samples)("all channels of %s are in [0, 1]", (hex) => {
      const [r, g, b] = hexToRgb(hex);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    });

    it.each(samples)("no channel of %s is NaN", (hex) => {
      const [r, g, b] = hexToRgb(hex);
      expect(r).not.toBeNaN();
      expect(g).not.toBeNaN();
      expect(b).not.toBeNaN();
    });
  });

  describe("invalid input falls back to [1, 1, 1]", () => {
    it("returns [1, 1, 1] for an empty string", () => {
      expect(hexToRgb("")).toEqual([1, 1, 1]);
    });

    it("returns [1, 1, 1] for a 3-digit shorthand (#fff)", () => {
      // 3-digit shorthand is not matched by the regex — treated as invalid
      expect(hexToRgb("#fff")).toEqual([1, 1, 1]);
    });

    it("returns [1, 1, 1] for a non-hex string", () => {
      expect(hexToRgb("red")).toEqual([1, 1, 1]);
    });

    it("returns [1, 1, 1] for a malformed value (#gggggg)", () => {
      expect(hexToRgb("#gggggg")).toEqual([1, 1, 1]);
    });
  });
});
