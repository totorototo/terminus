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
    expect(screen.getByText("est. finish time")).toBeInTheDocument();
    expect(screen.getByText("10–15%")).toBeInTheDocument();
  });

  it("labels both run and hike estimates with the currently selected runner profile", () => {
    setupStore({
      cumulativeDistances: [0, 100, 200],
      slopes: [0, 5, 10],
      paceFactors: [1, 1.2, 1.5],
      basePaceSPerKm: 300, // Elite preset
    });

    render(<RouteStats />);

    expect(screen.getByText("run time (Elite)")).toBeInTheDocument();
    expect(screen.getByText("hike time (Elite)")).toBeInTheDocument();
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

    // DEFAULT_PACE_SETTINGS.basePaceSPerKm (500) is closest to "Casual" (600,
    // diff 100) among the RUNNER_PROFILES presets (Trail 365, Athlete 330,
    // Elite 300 are all further away).
    expect(screen.getByText("run time (Casual)")).toBeInTheDocument();
  });

  it("shows a finish time equal to the run and hike times combined", () => {
    setupStore({
      cumulativeDistances: [0, 1000, 2000],
      slopes: [0, 0, 25],
      paceFactors: [1, 1, 2.5], // one runnable km, one hike-only km
      basePaceSPerKm: 490,
    });

    render(<RouteStats />);

    // 490 s/km run pace over 1km ≈ 8m10s; walk pace is 490+300=790 s/km,
    // scaled by paceFactor 2.5 over 1km ≈ 32m55s. Total ≈ 41m5s -> rounds
    // to 41m.
    expect(screen.getByText("est. finish time")).toBeInTheDocument();
    expect(
      screen.getByText("est. finish time").previousSibling.textContent,
    ).toBe("0h 41m");
  });
});
