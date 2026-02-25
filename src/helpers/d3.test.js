import { beforeEach, describe, expect, it } from "vitest";

import { ELEVATION_COLORS, ELEVATION_GRADE } from "../constants.js";
import {
  createColorScale,
  createXScale,
  createYScale,
  getArea,
  getLine,
} from "./d3";

describe("D3 Helpers", () => {
  it("createXScale should create a linear scale with correct domain and range", () => {
    const scale = createXScale({ min: 0, max: 10 }, { min: 0, max: 100 });
    expect(scale(0)).toBe(0);
    expect(scale(5)).toBe(50);
    expect(scale(10)).toBe(100);
  });

  it("createYScale should create a linear scale with correct domain and inverted range", () => {
    const scale = createYScale({ min: 0, max: 10 }, { min: 100, max: 0 });
    expect(scale(0)).toBe(100);
    expect(scale(5)).toBe(50);
    expect(scale(10)).toBe(0);
  });

  it("createColorScale should create a color scale mapping elevation grades to colors", () => {
    //use enums values for clarity (Elevation grades and Colors)
    const colorScale = createColorScale();
    expect(colorScale(ELEVATION_GRADE.SMALL)).toBe(ELEVATION_COLORS.SMALL);
    expect(colorScale(ELEVATION_GRADE.EASY)).toBe(ELEVATION_COLORS.EASY);
    expect(colorScale(ELEVATION_GRADE.MEDIUM)).toBe(ELEVATION_COLORS.MEDIUM);
    expect(colorScale(ELEVATION_GRADE.DIFFICULT)).toBe(
      ELEVATION_COLORS.DIFFICULT,
    );
    expect(colorScale(ELEVATION_GRADE.HARD)).toBe(ELEVATION_COLORS.HARD);
  });

  it("getLine should return a valid SVG path for given points", () => {
    const points = [
      [0, 0, 0],
      [1, 1, 10],
      [2, 2, 20],
      [3, 3, 30],
    ];
    const scaleX = createXScale({ min: 0, max: 4 }, { min: 0, max: 300 });
    const scaleY = createYScale({ min: 0, max: 30 }, { min: 100, max: 0 });
    const line = getLine(points, scaleX, scaleY);
    expect(line.path).toBeDefined();
    expect(typeof line.path).toBe("string");
  });

  it("getArea should return a valid SVG path for given points", () => {
    const points = [
      [0, 0, 0],
      [1, 1, 10],
      [2, 2, 20],
      [3, 3, 30],
    ];
    const scaleX = createXScale({ min: 0, max: 4 }, { min: 0, max: 300 });
    const scaleY = createYScale({ min: 0, max: 30 }, { min: 100, max: 0 });
    const area = getArea(points, scaleX, scaleY, 0);
    expect(area.path).toBeDefined();
    expect(typeof area.path).toBe("string");
  });
});
