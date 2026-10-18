import { describe, expect, it } from "vitest";

import {
  carryText,
  entryFueling,
  fuelingRows,
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
  times: [
    { arrivalS: 0, departureS: 0 },
    { arrivalS: 3600, departureS: 3600 },
    { arrivalS: 5400, departureS: 5400 },
    { arrivalS: 9000, departureS: 10800 },
    { arrivalS: 18000, departureS: 18000 },
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

describe("isValidFueling: the plan's times", () => {
  it("accepts a fueling without them, kept before Terminus read them", () => {
    expect(isValidFueling({ ...FUELING, times: undefined })).toBe(true);
    expect(isValidFueling({ ...FUELING, times: [] })).toBe(true);
  });

  it("rejects times that don't line up or run backwards", () => {
    expect(isValidFueling({ ...FUELING, times: FUELING.times.slice(1) })).toBe(
      false,
    );
    const backwards = FUELING.times.map((t, i) =>
      i === 2 ? { arrivalS: 3000, departureS: 3000 } : t,
    );
    expect(isValidFueling({ ...FUELING, times: backwards })).toBe(false);
    const leavesEarly = FUELING.times.map((t, i) =>
      i === 3 ? { arrivalS: 9000, departureS: 8000 } : t,
    );
    expect(isValidFueling({ ...FUELING, times: leavesEarly })).toBe(false);
  });
});

describe("fuelingRows", () => {
  const sections = [
    { startLocation: "Start", endLocation: "Ravito" },
    { startLocation: "Ravito", endLocation: "Col" },
    { startLocation: "Col", endLocation: "LB1" },
    { startLocation: "LB1", endLocation: "Finish" },
  ];

  it("has one row per plan entry, named after the route", () => {
    const { rows } = fuelingRows(FUELING, sections);
    expect(rows.map((row) => row.name)).toEqual([
      "Start",
      "Ravito",
      "Col",
      "LB1",
      "Finish",
    ]);
    expect(rows[1]).toMatchObject({ supply: "water", carry: FUELING.carry[1] });
  });

  it("sizes each leg's intake at the plan's times, without the stops", () => {
    const { rows } = fuelingRows(FUELING, sections);
    expect(rows[0].intake).toBeNull();
    // 1 h at 70 g, 500 ml, 400 mg.
    expect(rows[1].intake).toEqual({ carbsG: 70, fluidMl: 500, sodiumMg: 400 });
    // LB1 → Finish leaves after a 30 min stop: 2 h on the move.
    expect(rows[4].intake).toEqual({
      carbsG: 140,
      fluidMl: 1000,
      sodiumMg: 800,
    });
    expect(rows[3]).toMatchObject({ arrivalS: 9000, stopS: 1800 });
  });

  it("rounds up, as gpxz rounds the carry", () => {
    const oddTimes = FUELING.times.map((t, i) =>
      i === 1 ? { arrivalS: 3601, departureS: 3601 } : t,
    );
    const { rows } = fuelingRows({ ...FUELING, times: oddTimes }, sections);
    expect(rows[1].intake.carbsG).toBe(71);
  });

  it("totals the race to the finish, stops included", () => {
    expect(fuelingRows(FUELING, sections).totals).toEqual({
      durationS: 18000,
      carbsG: 350,
      fluidMl: 2500,
      sodiumMg: 2000,
    });
  });

  it("keeps the supplies and carry without the plan's times", () => {
    const { rows, totals } = fuelingRows(
      { ...FUELING, times: undefined },
      sections,
    );
    expect(totals).toBeNull();
    expect(rows[1]).toMatchObject({
      supply: "water",
      arrivalS: null,
      intake: null,
    });
  });

  it("is null without fueling, or when the plan doesn't line up", () => {
    expect(fuelingRows(null, sections)).toBeNull();
    expect(fuelingRows(FUELING, sections.slice(1))).toBeNull();
    expect(fuelingRows(FUELING, [])).toBeNull();
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
