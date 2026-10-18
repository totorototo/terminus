import { describe, expect, it } from "vitest";

import { modelText, planFileError } from "./PaceSettings.constants.js";

describe("modelText", () => {
  it("writes a model as one line", () => {
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
