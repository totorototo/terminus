import { render } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it, vi } from "vitest";

import THEME from "../../theme/Theme.js";
import Sections from "./Sections.jsx";

import "@testing-library/jest-dom";

const { mockProfile } = vi.hoisted(() => ({ mockProfile: vi.fn(() => null) }));

vi.mock("../profile/Profile.jsx", () => ({
  default: (props) => mockProfile(props),
}));

vi.mock("../../store/store.js", () => ({
  default: (selector) =>
    selector({
      legs: [
        { startIndex: 0, endIndex: 2 },
        { startIndex: 3, endIndex: 5 },
      ],
      gpx: { slopes: [0, 5, 30, -5, 8, 12] },
      app: { displaySlopes: true, profileMode: "slope", raceId: "race-1" },
      gps: { projectedLocation: { index: 0 } },
    }),
}));

const theme = { ...THEME, currentVariant: "dark" };

const renderSections = (sectionsPoints3D) =>
  render(
    <ThemeProvider theme={theme}>
      <Sections sectionsPoints3D={sectionsPoints3D} />
    </ThemeProvider>,
  );

describe("Sections", () => {
  it("slices the global slopes array to match each section's point slice", () => {
    const sectionsPoints3D = [
      { points: [[0, 0, 0]], id: "section-a" },
      { points: [[1, 1, 1]], id: "section-b" },
    ];

    renderSections(sectionsPoints3D);

    expect(mockProfile).toHaveBeenCalledTimes(2);
    expect(mockProfile.mock.calls[0][0].slopes).toEqual([0, 5, 30]);
    expect(mockProfile.mock.calls[1][0].slopes).toEqual([-5, 8, 12]);
  });
});
