import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clockTimeAtIndex } from "../../../helpers/nightOverlay.js";
import { sunAltitudeDeg } from "../../../helpers/sunTimes.js";
import * as storeModule from "../../../store/store.js";
import DayNightProfile from "./DayNightProfile.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./DayNightProfile.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../../../helpers/nightOverlay.js", () => ({
  clockTimeAtIndex: vi.fn(),
}));

vi.mock("../../../helpers/sunTimes.js", () => ({
  sunAltitudeDeg: vi.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const GPX_DATA = Array.from({ length: 10 }, () => [46.0, 6.0, 0]);
const CUMULATIVE_DISTANCES = Array.from({ length: 10 }, (_, i) => i * 1000);
const SECTIONS = [
  {
    startIndex: 0,
    endIndex: 9,
    totalDistance: 9000,
    estimatedDuration: 32400,
    startTime: 1_000_000, // seconds
  },
];

// index i ⇒ clock time raceStartMs + i*1000ms ⇒ altitude ALTITUDES[i]
const ALTITUDES = [-5, 10, 25, 40, 30, -10, -20, -15, 5, 20];

function setupStore({
  gpxData = [],
  cumulativeDistances = [],
  sections = [],
  projectedLocation = null,
} = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      gpx: { data: gpxData, cumulativeDistances },
      sections,
    }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

function mockAltitudeCurve() {
  const raceStartMs = SECTIONS[0].startTime * 1000;
  clockTimeAtIndex.mockImplementation((index) => raceStartMs + index * 1000);
  sunAltitudeDeg.mockImplementation((clockMs) => {
    const index = (clockMs - raceStartMs) / 1000;
    return ALTITUDES[index];
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("DayNightProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when gpx.data is empty", () => {
    setupStore({ gpxData: [], cumulativeDistances: CUMULATIVE_DISTANCES });
    const { container } = render(<DayNightProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when cumulativeDistances is empty", () => {
    setupStore({ gpxData: GPX_DATA, cumulativeDistances: [] });
    const { container } = render(<DayNightProfile />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no race start time (graceful degradation)", () => {
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      sections: [],
    });
    const { container } = render(<DayNightProfile />);
    expect(container).toBeEmptyDOMElement();
    expect(clockTimeAtIndex).not.toHaveBeenCalled();
  });

  it("shows the peak and lowest sun altitude rounded", () => {
    mockAltitudeCurve();
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      sections: SECTIONS,
    });
    render(<DayNightProfile />);
    expect(screen.getByText("40°")).toBeInTheDocument();
    expect(screen.getByText("-20°")).toBeInTheDocument();
  });

  it("always renders the horizon (zero) line, centered on a symmetric domain", () => {
    mockAltitudeCurve();
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      sections: SECTIONS,
    });
    const { container } = render(<DayNightProfile />);
    const horizonLine = container.querySelector(".dn-horizon-line");
    expect(horizonLine).toBeInTheDocument();
    expect(horizonLine).toHaveAttribute("y1", "44");
    expect(horizonLine).toHaveAttribute("y2", "44");
  });

  it("renders a progress mask up to the projected location", () => {
    mockAltitudeCurve();
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      sections: SECTIONS,
      projectedLocation: { index: 3, timestamp: 0 },
    });
    const { container } = render(<DayNightProfile />);
    const doneMask = container.querySelector(".dn-done-mask");
    expect(doneMask).toBeInTheDocument();
    expect(doneMask).toHaveAttribute("width", "100");
  });

  it("does not render a progress mask when no location is projected", () => {
    mockAltitudeCurve();
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      sections: SECTIONS,
      projectedLocation: null,
    });
    const { container } = render(<DayNightProfile />);
    expect(container.querySelector(".dn-done-mask")).not.toBeInTheDocument();
  });

  it("derives raceStartMs and startCoord from sections/gpx.data when computing the curve", () => {
    mockAltitudeCurve();
    setupStore({
      gpxData: GPX_DATA,
      cumulativeDistances: CUMULATIVE_DISTANCES,
      sections: SECTIONS,
    });
    render(<DayNightProfile />);
    expect(clockTimeAtIndex).toHaveBeenCalledWith(
      0,
      SECTIONS,
      CUMULATIVE_DISTANCES,
      SECTIONS[0].startTime * 1000,
    );
    expect(sunAltitudeDeg).toHaveBeenCalledWith(
      expect.any(Number),
      GPX_DATA[0][0],
      GPX_DATA[0][1],
    );
  });
});
