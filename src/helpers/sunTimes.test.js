import { describe, expect, it } from "vitest";

import { sunAltitudeDeg } from "./sunTimes.js";

const LONDON = { lat: 51.5, lon: -0.13 };
const EQUATOR = { lat: 0, lon: 0 };
const HIGH_ARCTIC = { lat: 78, lon: 15 }; // Svalbard-ish

describe("sunAltitudeDeg", () => {
  it("is positive (sun above horizon) around local solar noon in summer", () => {
    const noonUtc = new Date("2024-06-21T12:00:00Z").valueOf();
    const altitude = sunAltitudeDeg(noonUtc, LONDON.lat, LONDON.lon);
    expect(altitude).toBeGreaterThan(40);
  });

  it("is negative (sun below horizon) around local solar midnight", () => {
    const midnightUtc = new Date("2024-06-21T00:00:00Z").valueOf();
    const altitude = sunAltitudeDeg(midnightUtc, LONDON.lat, LONDON.lon);
    expect(altitude).toBeLessThan(0);
  });

  it("reaches a higher noon altitude in summer than winter at mid-latitude", () => {
    const summerNoon = sunAltitudeDeg(
      new Date("2024-06-21T12:00:00Z").valueOf(),
      LONDON.lat,
      LONDON.lon,
    );
    const winterNoon = sunAltitudeDeg(
      new Date("2024-12-21T12:00:00Z").valueOf(),
      LONDON.lat,
      LONDON.lon,
    );
    expect(summerNoon).toBeGreaterThan(winterNoon);
  });

  it("reaches near-zenith altitude at the equator at solar noon near the equinox", () => {
    const noonUtc = new Date("2024-03-20T12:00:00Z").valueOf();
    const altitude = sunAltitudeDeg(noonUtc, EQUATOR.lat, EQUATOR.lon);
    expect(altitude).toBeGreaterThan(80);
  });

  it("stays negative all day during polar night", () => {
    const day = "2024-12-21";
    for (const hour of [0, 6, 12, 18]) {
      const t = new Date(
        `${day}T${String(hour).padStart(2, "0")}:00:00Z`,
      ).valueOf();
      expect(sunAltitudeDeg(t, HIGH_ARCTIC.lat, HIGH_ARCTIC.lon)).toBeLessThan(
        0,
      );
    }
  });

  it("stays positive all day during polar day", () => {
    const day = "2024-06-21";
    for (const hour of [0, 6, 12, 18]) {
      const t = new Date(
        `${day}T${String(hour).padStart(2, "0")}:00:00Z`,
      ).valueOf();
      expect(
        sunAltitudeDeg(t, HIGH_ARCTIC.lat, HIGH_ARCTIC.lon),
      ).toBeGreaterThan(0);
    }
  });
});
