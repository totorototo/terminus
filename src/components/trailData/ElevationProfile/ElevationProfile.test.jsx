import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import ElevationProfile from "./ElevationProfile.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./ElevationProfile.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

// 301 points, elevation rising 1000 m → 1300 m, 50 m apart → total 15 000 m
const GPX_DATA = Array.from({ length: 301 }, (_, i) => [0, 0, 1000 + i]);
const CUMULATIVE_DISTANCES = Array.from({ length: 301 }, (_, i) => i * 50);

const LEGS = [
  { startIndex: 0, startLocation: "Start" },
  { startIndex: 100, startLocation: "Checkpoint A" },
  { startIndex: 200, startLocation: "Checkpoint B" },
];

function setupStore({
  gpxData = [],
  cumulativeDistances = [],
  legs = [],
  projectedLocation = null,
} = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      gpx: { data: gpxData, cumulativeDistances },
      legs,
    }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ElevationProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when gpx.data is empty", () => {
    setupStore({ gpxData: [] });
    const { container } = render(<ElevationProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when gpx.data is undefined", () => {
    setupStore({ gpxData: undefined });
    const { container } = render(<ElevationProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an SVG with line and area paths for a valid fixture", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
    });
    const { container } = render(<ElevationProfile />);
    expect(container.querySelector(".ep-line")).toBeInTheDocument();
    expect(container.querySelector(".ep-area")).toBeInTheDocument();
  });

  it("shows min/max elevation and total distance labels", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
    });
    render(<ElevationProfile />);
    expect(screen.getByText("1000 m")).toBeInTheDocument();
    expect(screen.getByText("1300 m")).toBeInTheDocument();
    expect(screen.getByText("15 km")).toBeInTheDocument();
  });

  it("renders a runner marker at the correct position when a location is projected", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      projectedLocation: { index: 150, timestamp: 0 },
    });
    const { container } = render(<ElevationProfile />);
    const runnerDot = container.querySelector(".ep-runner-dot");
    expect(runnerDot).toBeInTheDocument();
    expect(runnerDot).toHaveAttribute("cx", "150");
    expect(screen.getByText("8 km")).toBeInTheDocument();
  });

  it("does not render a runner marker when no location is projected", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      projectedLocation: null,
    });
    const { container } = render(<ElevationProfile />);
    expect(container.querySelector(".ep-runner-dot")).not.toBeInTheDocument();
    expect(container.querySelector(".ep-runner-line")).not.toBeInTheDocument();
  });

  it("renders section boundary labels for well-spaced legs", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      legs: LEGS,
    });
    render(<ElevationProfile />);
    expect(screen.getByText("Checkpoint A")).toBeInTheDocument();
    expect(screen.getByText("Checkpoint B")).toBeInTheDocument();
  });

  it("does not render a label for the leg starting at index 0", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      legs: LEGS,
    });
    render(<ElevationProfile />);
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });

  it("filters out overlapping section labels that are too close together", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      legs: [
        { startIndex: 100, startLocation: "Checkpoint A" },
        { startIndex: 110, startLocation: "Checkpoint B" },
      ],
    });
    render(<ElevationProfile />);
    expect(screen.getByText("Checkpoint A")).toBeInTheDocument();
    expect(screen.queryByText("Checkpoint B")).not.toBeInTheDocument();
  });
});
