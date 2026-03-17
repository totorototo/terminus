import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useStore from "../../store/store.js";
import LiveTracking from "./LiveTracking.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
}));

vi.mock("@react-spring/web", () => ({
  animated: {
    div: ({ children }) => <div>{children}</div>,
  },
  useSpring: (config) => {
    const result = {};
    for (const [key, value] of Object.entries(config)) {
      if (key !== "config") {
        result[key] = { to: (fn) => fn(value) };
      }
    }
    return result;
  },
}));

vi.mock("@styled-icons/feather/Navigation", () => ({
  Navigation: ({ size, ...props }) => <div data-icon="navigation" {...props} />,
}));

vi.mock("./LiveTracking.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

const makeStore = (overrides = {}) => ({
  gpx: {
    cumulativeDistances: [0, 1000, 2000, 3000],
    cumulativeElevations: [0, 50, 100, 150],
    cumulativeElevationLosses: [0, 10, 20, 30],
  },
  gps: {
    data: [
      [0, 0, 1200],
      [0, 0, 1100],
      [0, 0, 1000],
      [0, 0, 900],
    ],
  },
  app: {
    currentPositionIndex: 1,
  },
  stats: {
    distance: 3000,
    elevationGain: 150,
    elevationLoss: 30,
  },
  ...overrides,
});

beforeEach(() => {
  useStore.mockImplementation((selector) => selector(makeStore()));
});

describe("LiveTracking", () => {
  it("renders without crashing", () => {
    const { container } = render(<LiveTracking />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows distance remaining", () => {
    render(<LiveTracking />);
    expect(screen.getByText("2.0 km")).toBeInTheDocument();
  });

  it("shows elevation gain remaining", () => {
    render(<LiveTracking />);
    expect(screen.getByText("↗ 100 m")).toBeInTheDocument();
  });

  it("shows elevation loss remaining", () => {
    render(<LiveTracking />);
    expect(screen.getByText("↘ 20 m")).toBeInTheDocument();
  });

  it("shows current altitude", () => {
    render(<LiveTracking />);
    expect(screen.getByText("1100 m")).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<LiveTracking />);
    expect(screen.getByText("75.00 %")).toBeInTheDocument();
  });

  it("shows 0 km remaining when no data", () => {
    useStore.mockImplementation((selector) =>
      selector(
        makeStore({
          gpx: {
            cumulativeDistances: null,
            cumulativeElevations: null,
            cumulativeElevationLosses: null,
          },
          gps: { data: null },
          app: { currentPositionIndex: null },
          stats: null,
        }),
      ),
    );
    render(<LiveTracking />);
    expect(screen.getByText("0.0 km")).toBeInTheDocument();
  });

  it("shows 0% progress when no GPS data", () => {
    useStore.mockImplementation((selector) =>
      selector(
        makeStore({
          gps: { data: null },
          app: { currentPositionIndex: null },
        }),
      ),
    );
    render(<LiveTracking />);
    expect(screen.getByText("0.00 %")).toBeInTheDocument();
  });
});
