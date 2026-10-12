import { describe, expect, it } from "vitest";

import {
  checkGpxFile,
  MAX_GPX_BYTES,
  trailNameFromFileName,
} from "./localGpx.js";

const file = (name, size) => ({ name, size });

describe("checkGpxFile", () => {
  it("accepts a .gpx file, whatever the extension's case", () => {
    expect(checkGpxFile(file("race.gpx", 10))).toBeNull();
    expect(checkGpxFile(file("RACE.GPX", 10))).toBeNull();
  });

  it("refuses a missing file", () => {
    expect(checkGpxFile(undefined)).toBe("No file selected.");
  });

  it("refuses another extension", () => {
    expect(checkGpxFile(file("race.kml", 10))).toBe("Choose a .gpx file.");
  });

  it("refuses an empty file", () => {
    expect(checkGpxFile(file("race.gpx", 0))).toBe("This file is empty.");
  });

  it("refuses a file over the size limit", () => {
    expect(checkGpxFile(file("race.gpx", MAX_GPX_BYTES))).toBeNull();
    expect(checkGpxFile(file("race.gpx", MAX_GPX_BYTES + 1))).toBe(
      "This file is too large (50 MB max).",
    );
  });
});

describe("trailNameFromFileName", () => {
  it("drops the .gpx extension, whatever its case", () => {
    expect(trailNameFromFileName("trail-passion-79697.gpx")).toBe(
      "trail-passion-79697",
    );
    expect(trailNameFromFileName("UTMB 2026.GPX")).toBe("UTMB 2026");
  });

  it("returns null when there is no usable name", () => {
    expect(trailNameFromFileName(null)).toBeNull();
    expect(trailNameFromFileName(".gpx")).toBeNull();
  });
});
