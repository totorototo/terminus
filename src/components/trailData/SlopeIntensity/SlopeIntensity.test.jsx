import { render, screen } from "@testing-library/react";
import { useTheme } from "styled-components";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import SlopeIntensity from "./SlopeIntensity.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./SlopeIntensity.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("styled-components", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useTheme: vi.fn() };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const GPX_DATA = Array.from({ length: 11 }, () => [0, 0, 0]);

// One grade in each severity band, then flat ground for the rest
const SLOPES = [2, 7, 12, 17, 25, 0, 0, 0, 0, 0, 0];

function setupStore({
  gpxData = [],
  slopes = [],
  projectedLocation = null,
} = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({ gpx: { data: gpxData, slopes } }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SlopeIntensity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTheme.mockReturnValue({
      colors: { dark: { "--color-accent": "#3388ff" } },
      currentVariant: "dark",
    });
  });

  it("renders nothing when gpx.data is empty", () => {
    setupStore({ gpxData: [], slopes: SLOPES });
    const { container } = render(<SlopeIntensity />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when slopes is empty", () => {
    setupStore({ gpxData: GPX_DATA, slopes: [] });
    const { container } = render(<SlopeIntensity />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one colored band rect per sampled point", () => {
    setupStore({ gpxData: GPX_DATA, slopes: SLOPES });
    const { container } = render(<SlopeIntensity />);
    const bands = container.querySelectorAll(
      ".si-strip rect:not(.si-done-mask)",
    );
    expect(bands).toHaveLength(SLOPES.length);
    bands.forEach((band) => {
      expect(band.getAttribute("fill")).toEqual(expect.any(String));
      expect(band.getAttribute("fill")).not.toBe("");
    });
  });

  it("always renders the five grade band legend labels", () => {
    setupStore({ gpxData: GPX_DATA, slopes: SLOPES });
    render(<SlopeIntensity />);
    expect(screen.getByText("0–5%")).toBeInTheDocument();
    expect(screen.getByText("5–10%")).toBeInTheDocument();
    expect(screen.getByText("10–15%")).toBeInTheDocument();
    expect(screen.getByText("15–20%")).toBeInTheDocument();
    expect(screen.getByText("20%+")).toBeInTheDocument();
  });

  it("renders a progress mask up to the projected location", () => {
    setupStore({
      gpxData: GPX_DATA,
      slopes: SLOPES,
      projectedLocation: { index: 5, timestamp: 0 },
    });
    const { container } = render(<SlopeIntensity />);
    const doneMask = container.querySelector(".si-done-mask");
    expect(doneMask).toBeInTheDocument();
    expect(doneMask).toHaveAttribute("width", "150");
  });

  it("does not render a progress mask when no location is projected", () => {
    setupStore({ gpxData: GPX_DATA, slopes: SLOPES, projectedLocation: null });
    const { container } = render(<SlopeIntensity />);
    expect(container.querySelector(".si-done-mask")).not.toBeInTheDocument();
  });
});
