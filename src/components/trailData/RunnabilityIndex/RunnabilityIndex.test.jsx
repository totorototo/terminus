import { render, screen } from "@testing-library/react";
import { useTheme } from "styled-components";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import RunnabilityIndex from "./RunnabilityIndex.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./RunnabilityIndex.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("styled-components", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useTheme: vi.fn() };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const GPX_DATA = Array.from({ length: 11 }, () => [0, 0, 0]);

// One pace factor in each band, then flat ground for the rest
const PACE_FACTORS = [1.0, 1.5, 2.0, 2.3, 3.0, 1, 1, 1, 1, 1, 1];

function setupStore({
  gpxData = [],
  paceFactors = [],
  projectedLocation = null,
} = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({ gpx: { data: gpxData, paceFactors } }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RunnabilityIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTheme.mockReturnValue({
      colors: { dark: { "--color-primary": "#3388ff" } },
      currentVariant: "dark",
    });
  });

  it("renders nothing when gpx.data is empty", () => {
    setupStore({ gpxData: [], paceFactors: PACE_FACTORS });
    const { container } = render(<RunnabilityIndex />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when paceFactors is empty", () => {
    setupStore({ gpxData: GPX_DATA, paceFactors: [] });
    const { container } = render(<RunnabilityIndex />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one colored band rect per sampled point", () => {
    setupStore({ gpxData: GPX_DATA, paceFactors: PACE_FACTORS });
    const { container } = render(<RunnabilityIndex />);
    const bands = container.querySelectorAll(
      ".ri-strip rect:not(.ri-done-mask)",
    );
    expect(bands).toHaveLength(PACE_FACTORS.length);
    bands.forEach((band) => {
      expect(band.getAttribute("fill")).toEqual(expect.any(String));
      expect(band.getAttribute("fill")).not.toBe("");
    });
  });

  it("always renders the three runnability band legend labels", () => {
    setupStore({ gpxData: GPX_DATA, paceFactors: PACE_FACTORS });
    render(<RunnabilityIndex />);
    expect(screen.getByText("Runnable")).toBeInTheDocument();
    expect(screen.getByText("Marginal")).toBeInTheDocument();
    expect(screen.getByText("Hike-only")).toBeInTheDocument();
  });

  it("renders a progress mask up to the projected location", () => {
    setupStore({
      gpxData: GPX_DATA,
      paceFactors: PACE_FACTORS,
      projectedLocation: { index: 5, timestamp: 0 },
    });
    const { container } = render(<RunnabilityIndex />);
    const doneMask = container.querySelector(".ri-done-mask");
    expect(doneMask).toBeInTheDocument();
    expect(doneMask).toHaveAttribute("width", "150");
  });

  it("does not render a progress mask when no location is projected", () => {
    setupStore({
      gpxData: GPX_DATA,
      paceFactors: PACE_FACTORS,
      projectedLocation: null,
    });
    const { container } = render(<RunnabilityIndex />);
    expect(container.querySelector(".ri-done-mask")).not.toBeInTheDocument();
  });
});
