import { describe, expect, it } from "vitest";

import { hexToRgb } from "./colors.js";

describe("colors test suite", () => {
  it("should convert hex color to RGB correctly", () => {
    expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
  });
});
