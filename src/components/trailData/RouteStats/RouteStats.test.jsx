import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import RouteStats from "./RouteStats.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  DEFAULT_PACE_SETTINGS: { basePaceSPerKm: 500 },
}));

vi.mock("./RouteStats.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

function setupStore({
  slopes = [],
  paceFactors = [],
  cumulativeDistances = [],
  basePaceSPerKm = 500,
} = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      gpx: { slopes, paceFactors, cumulativeDistances },
      app: { paceSettings: { basePaceSPerKm } },
    }),
  );
}

describe("RouteStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when route data is empty", () => {
    setupStore();
    const { container } = render(<RouteStats />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders gradient, terrain and time stats for a route", () => {
    setupStore({
      cumulativeDistances: [0, 100, 200, 300, 400],
      slopes: [0, 0, 12, -1, -18],
      paceFactors: [1, 1, 1.8, 1, 0.9],
    });

    render(<RouteStats />);

    expect(screen.getByText("+12.0%")).toBeInTheDocument();
    expect(screen.getByText("-18.0%")).toBeInTheDocument();
    expect(screen.getByText("hike time (8:20/km)")).toBeInTheDocument();
  });

  it("labels both run and hike estimates with the plan's flat pace", () => {
    setupStore({
      cumulativeDistances: [0, 100, 200],
      slopes: [0, 5, 10],
      paceFactors: [1, 1.2, 1.5],
      basePaceSPerKm: 300,
    });

    render(<RouteStats />);

    expect(screen.getByText("run time (5:00/km)")).toBeInTheDocument();
    expect(screen.getByText("hike time (5:00/km)")).toBeInTheDocument();
  });

  it("falls back to the default pace when the app slice is absent entirely", () => {
    // Not just paceSettings missing — the whole app slice, as can happen in
    // an isolated test/story render before the store has hydrated.
    storeModule.default.mockImplementation((selector) =>
      selector({
        gpx: {
          slopes: [0, 5, 10],
          paceFactors: [1, 1.2, 1.5],
          cumulativeDistances: [0, 100, 200],
        },
      }),
    );

    render(<RouteStats />);

    // DEFAULT_PACE_SETTINGS.basePaceSPerKm: 500 s/km.
    expect(screen.getByText("run time (8:20/km)")).toBeInTheDocument();
  });
});
