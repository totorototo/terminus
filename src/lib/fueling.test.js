import { describe, expect, it } from "vitest";

import {
  carryText,
  entryFueling,
  isValidFueling,
  nextRefill,
} from "./fueling.js";

const FUELING = {
  carbsGPerH: 70,
  fluidMlPerH: 500,
  sodiumMgPerH: 400,
  reserveS: 1800,
  supplies: ["full", "water", "none", "full", "none"],
  carry: [
    { fluidMl: 1650, carbsG: 455, sodiumMg: 2600 },
    { fluidMl: 900, carbsG: null, sodiumMg: null },
    null,
    { fluidMl: 1200, carbsG: 520, sodiumMg: 800 },
    null,
  ],
};

describe("isValidFueling", () => {
  it("accepts what the worker gives", () => {
    expect(isValidFueling(FUELING)).toBe(true);
  });

  it("rejects a bad shape, a bad supply, or mismatched lengths", () => {
    expect(isValidFueling(null)).toBe(false);
    expect(isValidFueling({ ...FUELING, carbsGPerH: -1 })).toBe(false);
    expect(isValidFueling({ ...FUELING, reserveS: Infinity })).toBe(false);
    expect(
      isValidFueling({
        ...FUELING,
        supplies: ["full", "food", "none", "full", "none"],
      }),
    ).toBe(false);
    expect(isValidFueling({ ...FUELING, carry: FUELING.carry.slice(1) })).toBe(
      false,
    );
    expect(
      isValidFueling({
        ...FUELING,
        carry: [
          { fluidMl: "1 L", carbsG: null, sodiumMg: null },
          null,
          null,
          null,
          null,
        ],
      }),
    ).toBe(false);
  });
});

describe("entryFueling", () => {
  it("maps section i's end to plan entry i + 1", () => {
    expect(entryFueling(FUELING, 4, 0).supply).toBe("full");
    expect(entryFueling(FUELING, 4, 1)).toEqual({
      supply: "water",
      carry: FUELING.carry[1],
    });
    expect(entryFueling(FUELING, 4, 2)).toEqual({
      supply: "none",
      carry: null,
    });
  });

  it("is null without fueling, out of range, or when the plan doesn't line up", () => {
    expect(entryFueling(null, 4, 1)).toBeNull();
    expect(entryFueling(FUELING, 4, 5)).toBeNull();
    expect(entryFueling(FUELING, 3, 1)).toBeNull();
  });
});

describe("nextRefill", () => {
  const checkpoints = [
    { endLocation: "Ravito", isPast: false },
    { endLocation: "Col", isPast: false },
    { endLocation: "LB1", isPast: false },
    { endLocation: "Finish", isPast: false },
  ];

  it("is the first refill ahead of the runner", () => {
    expect(nextRefill(FUELING, checkpoints)).toMatchObject({
      index: 0,
      supply: "water",
      checkpoint: { endLocation: "Ravito" },
    });
    const pastRavito = checkpoints.map((cp, i) => ({ ...cp, isPast: i === 0 }));
    expect(nextRefill(FUELING, pastRavito)).toMatchObject({
      index: 2,
      supply: "full",
    });
  });

  it("is null past the last refill, or without fueling", () => {
    const allPast = checkpoints.map((cp, i) => ({ ...cp, isPast: i < 3 }));
    expect(nextRefill(FUELING, allPast)).toBeNull();
    expect(nextRefill(null, checkpoints)).toBeNull();
  });
});

describe("carryText", () => {
  it("lists what is refilled, with fluid in L past a litre", () => {
    expect(carryText(FUELING.carry[0])).toBe(
      "455 g carbs · 1.65 L · 2.6 g sodium",
    );
    expect(carryText(FUELING.carry[1])).toBe("900 ml");
    expect(carryText({ fluidMl: 2000, carbsG: 0, sodiumMg: 800 })).toBe(
      "0 g carbs · 2 L · 800 mg sodium",
    );
  });
});
