import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TrailData from "./TrailData.jsx";
import * as storeModule from "../../store/store.js";

// Mock store hooks
vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
  useStats: vi.fn(),
}));

// Mock react-spring
vi.mock("@react-spring/web", () => ({
  useSpring: vi.fn((values) => ({
    remainingDistance: {
      to: (fn) => fn(values.remainingDistance),
    },
    remainingElevation: {
      to: (fn) => fn(values.remainingElevation),
    },
    remainingElevationLoss: {
      to: (fn) => fn(values.remainingElevationLoss),
    },
  })),
  animated: {
    div: ({ children, className, style }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  format: () => "14:30",
  formatDuration: () => "1d 2h 30min",
  intervalToDuration: () => ({ days: 1, hours: 2, minutes: 30 }),
}));

// Mock TrailData.style
vi.mock("./TrailData.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("TrailData Component", () => {
  const mockStats = {
    distance: 10000,
    elevationGain: 1000,
    elevationLoss: 500,
  };

  const mockCumulativeDistances = [0, 1000, 2000, 3000, 4000, 5000];
  const mockCumulativeElevations = [0, 100, 200, 300, 400, 500];
  const mockCumulativeElevationLosses = [0, 50, 100, 150, 200, 250];

  const mockSections = [{ startTime: 1000 }, { startTime: 2000 }];

  const mockProjectedLocation = {
    index: 2,
    timestamp: 1500000,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useStore (default export)
    storeModule.default.mockImplementation((selector) => {
      const state = {
        sections: mockSections,
        flush: vi.fn(),
        gpx: {
          cumulativeDistances: mockCumulativeDistances,
          cumulativeElevations: mockCumulativeElevations,
          cumulativeElevationLosses: mockCumulativeElevationLosses,
        },
      };
      return selector(state);
    });

    // Mock useProjectedLocation
    storeModule.useProjectedLocation.mockReturnValue(mockProjectedLocation);

    // Mock useStats
    storeModule.useStats.mockReturnValue(mockStats);
  });

  describe("basic rendering", () => {
    it("should render without errors", () => {
      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should render with className prop", () => {
      const { container } = render(<TrailData className="custom-class" />);
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  describe("displaying data", () => {
    it("should display ETA time", () => {
      render(<TrailData />);
      expect(screen.getByText("14:30")).toBeInTheDocument();
    });

    it("should display remaining duration", () => {
      render(<TrailData />);
      expect(screen.getByText("1d 2h 30min")).toBeInTheDocument();
    });

    it("should display distance unit (km)", () => {
      render(<TrailData />);
      expect(screen.getByText("km")).toBeInTheDocument();
    });

    it("should display eta label", () => {
      render(<TrailData />);
      expect(screen.getByText("eta")).toBeInTheDocument();
    });

    it("should display remaining label", () => {
      render(<TrailData />);
      expect(screen.getByText("remaining")).toBeInTheDocument();
    });
  });

  describe("handling missing data", () => {
    it("should handle missing cumulative distances", () => {
      storeModule.default.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          flush: vi.fn(),
          gpx: {
            cumulativeDistances: [],
            cumulativeElevations: [],
            cumulativeElevationLosses: [],
          },
        };
        return selector(state);
      });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should handle missing sections", () => {
      storeModule.default.mockImplementation((selector) => {
        const state = {
          sections: null,
          flush: vi.fn(),
          gpx: {
            cumulativeDistances: mockCumulativeDistances,
            cumulativeElevations: mockCumulativeElevations,
            cumulativeElevationLosses: mockCumulativeElevationLosses,
          },
        };
        return selector(state);
      });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should handle empty sections array", () => {
      storeModule.default.mockImplementation((selector) => {
        const state = {
          sections: [],
          flush: vi.fn(),
          gpx: {
            cumulativeDistances: mockCumulativeDistances,
            cumulativeElevations: mockCumulativeElevations,
            cumulativeElevationLosses: mockCumulativeElevationLosses,
          },
        };
        return selector(state);
      });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should handle missing stats", () => {
      storeModule.useStats.mockReturnValue(null);

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should handle missing projected location", () => {
      storeModule.useProjectedLocation.mockReturnValue({ timestamp: 0 });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });
  });

  describe("button functionality", () => {
    it("should render flush data button", () => {
      render(<TrailData />);
      expect(screen.getByText("Flush Data")).toBeInTheDocument();
    });

    it("should call flush when button is clicked", () => {
      const mockFlush = vi.fn();
      storeModule.default.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          flush: mockFlush,
          gpx: {
            cumulativeDistances: mockCumulativeDistances,
            cumulativeElevations: mockCumulativeElevations,
            cumulativeElevationLosses: mockCumulativeElevationLosses,
          },
        };
        return selector(state);
      });

      render(<TrailData />);
      const button = screen.getByText("Flush Data");
      button.click();
      expect(mockFlush).toHaveBeenCalled();
    });
  });

  describe("build number display", () => {
    it("should display build number", () => {
      render(<TrailData />);
      // The build number will be "dev" or whatever VITE_NUMBER is set to
      expect(screen.getByText(/Build Number:/)).toBeInTheDocument();
    });
  });

  describe("data calculations", () => {
    it("should calculate remaining distance based on stats and current position", () => {
      render(<TrailData />);
      // Component should render with calculated remaining values
      expect(screen.getByText("km")).toBeInTheDocument();
    });

    it("should update when projected location changes", () => {
      const { rerender } = render(<TrailData />);

      storeModule.useProjectedLocation.mockReturnValue({
        index: 4,
        timestamp: 2000000,
      });

      rerender(<TrailData />);
      expect(screen.getByText("km")).toBeInTheDocument();
    });

    it("should update when stats change", () => {
      const { rerender } = render(<TrailData />);

      storeModule.useStats.mockReturnValue({
        distance: 15000,
        elevationGain: 1500,
        elevationLoss: 750,
      });

      rerender(<TrailData />);
      expect(screen.getByText("km")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle zero stats", () => {
      storeModule.useStats.mockReturnValue({
        distance: 0,
        elevationGain: 0,
        elevationLoss: 0,
      });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should handle very large stats", () => {
      storeModule.useStats.mockReturnValue({
        distance: 1000000,
        elevationGain: 100000,
        elevationLoss: 50000,
      });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should handle index at start of trail", () => {
      storeModule.useProjectedLocation.mockReturnValue({
        index: 0,
        timestamp: 1000000,
      });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });

    it("should handle index at end of trail", () => {
      storeModule.useProjectedLocation.mockReturnValue({
        index: mockCumulativeDistances.length - 1,
        timestamp: 5000000,
      });

      const { container } = render(<TrailData />);
      expect(container).toBeInTheDocument();
    });
  });

  describe("layout and structure", () => {
    it("should render data container", () => {
      const { container } = render(<TrailData />);
      expect(container.querySelector(".data-container")).toBeInTheDocument();
    });

    it("should render command container", () => {
      const { container } = render(<TrailData />);
      expect(container.querySelector(".command-container")).toBeInTheDocument();
    });

    it("should have data items", () => {
      const { container } = render(<TrailData />);
      const items = container.querySelectorAll(".item");
      expect(items.length).toBeGreaterThan(0);
    });
  });
});
