import { describe } from "vitest";
import { getRange } from "./getRange.js";

describe("getRange", () => {
  it("should return correct elevation grade for given slope percentages", () => {
    // use enums values for clarity
    expect(getRange(0)).toBe(ELEVATION_GRADE.SMALL);
    expect(getRange(5)).toBe(ELEVATION_GRADE.EASY);
    expect(getRange(10)).toBe(ELEVATION_GRADE.MEDIUM);
    expect(getRange(15)).toBe(ELEVATION_GRADE.DIFFICULT);
    expect(getRange(20)).toBe(ELEVATION_GRADE.HARD);
    expect(getRange(25)).toBe(ELEVATION_GRADE.HARD);
  });
});
