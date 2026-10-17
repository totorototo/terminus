import { describe, expect, it } from "vitest";

import { cutoffTier, formatMargin } from "./etaLegHelpers.js";

const MIN = 60_000;

describe("cutoffTier", () => {
  it("is null without a margin", () => {
    expect(cutoffTier(null)).toBeNull();
    expect(cutoffTier(undefined)).toBeNull();
    expect(cutoffTier(NaN)).toBeNull();
  });

  it("is ok at 1h or more", () => {
    expect(cutoffTier(60 * MIN)).toBe("ok");
    expect(cutoffTier(64 * MIN)).toBe("ok");
  });

  it("is tight under 1h, including zero", () => {
    expect(cutoffTier(59 * MIN)).toBe("tight");
    expect(cutoffTier(0)).toBe("tight");
  });

  it("is over past the cutoff", () => {
    expect(cutoffTier(-1)).toBe("over");
    expect(cutoffTier(-24 * MIN)).toBe("over");
  });
});

describe("formatMargin", () => {
  it("writes hours and two-digit minutes", () => {
    expect(formatMargin(64 * MIN)).toBe("1h04");
    expect(formatMargin(7 * MIN)).toBe("0h07");
  });

  it("uses a minus sign when over", () => {
    expect(formatMargin(-24 * MIN)).toBe("−0h24");
  });

  it("drops the sign when it rounds to zero", () => {
    expect(formatMargin(-10_000)).toBe("0h00");
  });

  it("caps margins past 99h", () => {
    expect(formatMargin(-2173 * 60 * MIN)).toBe("−99h+");
    expect(formatMargin(120 * 60 * MIN)).toBe("99h+");
    expect(formatMargin(99 * 60 * MIN)).toBe("99h00");
  });

  it("is a dash without a margin", () => {
    expect(formatMargin(null)).toBe("--");
  });
});
