import { describe, expect, it } from "vitest";

import {
  checkPlanFile,
  MAX_PLAN_BYTES,
  modelText,
  paceText,
  planFileError,
} from "./planFile.js";

const file = (name, size = 10) => ({ name, size });

describe("checkPlanFile", () => {
  it("takes a .json file up to the limit", () => {
    expect(checkPlanFile(file("race.plan.json"))).toBeNull();
    expect(checkPlanFile(file("RACE.JSON", MAX_PLAN_BYTES))).toBeNull();
  });

  it("refuses anything else", () => {
    expect(checkPlanFile(null)).toBe("No file selected.");
    expect(checkPlanFile(file("race.gpx"))).toBe(
      "Choose the race's plan.json.",
    );
    expect(checkPlanFile(file("race.json", 0))).toBe("This file is empty.");
    expect(checkPlanFile(file("race.json", MAX_PLAN_BYTES + 1))).toMatch(
      /too large/,
    );
  });
});

describe("modelText and paceText", () => {
  it("write a model as one line", () => {
    expect(paceText(450)).toBe("7:30/km");
    expect(
      modelText({ basePaceSPerKm: 500, kFatigue: 0.002, lifeBaseStopS: 5400 }),
    ).toBe("8:20/km flat · fatigue 0.002 · 1h30 at each LifeBase");
    expect(
      modelText({ basePaceSPerKm: 300, kFatigue: 0, lifeBaseStopS: 0 }),
    ).toBe("5:00/km flat · fatigue 0 · no stop at LifeBases");
  });
});

describe("planFileError", () => {
  it("explains gpxz's refusals by name, as Zig or as Zigar's words", () => {
    expect(planFileError("CourseMismatch")).toBe(
      planFileError("Course mismatch"),
    );
    expect(planFileError("Plan invalid")).toMatch(/edited by hand/);
    expect(planFileError("SchemaVersionUnsupported")).toMatch(/newer Regimen/);
    expect(planFileError("Syntax error")).toBe("This file is not a plan.json.");
  });
});
