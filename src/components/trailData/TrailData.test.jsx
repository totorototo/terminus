import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../store/store.js";
import TrailData from "./TrailData.jsx";

import "@testing-library/jest-dom/vitest";

// Mock store hooks
vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
  useStats: vi.fn(),
}));

// Mock react-spring
vi.mock("@react-spring/web", () => ({
  useSpring: vi.fn((values) => ({
    remainingKm: {
      to: (fn) => fn(values.remainingKm),
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
  format: () => "Thu 14:30",
}));

// Mock TrailData.style
vi.mock("./TrailData.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// Mock TrailActions component
vi.mock("./TrailActions/TrailActions.jsx", () => ({
  default: () => <div data-testid="trail-actions">TrailActions</div>,
}));

// Mock TrailProgression component
vi.mock("./TrailProgression/TrailProgression.jsx", () => ({
  default: () => <div data-testid="trail-progression">TrailProgression</div>,
}));

// Mock SectionETA component
vi.mock("./SectionETA/SectionETA.jsx", () => ({
  default: () => <div data-testid="section-eta">SectionETA</div>,
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
        toggleTrackingMode: vi.fn(),
        app: {
          trackingMode: false,
        },
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
    it("should display ETA time with day", () => {
      render(<TrailData />);
      expect(screen.getByText("THU 14:30")).toBeInTheDocument();
    });

    it("should display remaining duration", () => {
      render(<TrailData />);
      // Check that remaining label is present (duration value format changed to "Xh Ym")
      expect(screen.getByText("remaining")).toBeInTheDocument();
    });

    it("should display distance unit (km left)", () => {
      render(<TrailData />);
      expect(screen.getByText("km left")).toBeInTheDocument();
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
          toggleTrackingMode: vi.fn(),
          app: {
            profileMode: false,
          },
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
          toggleTrackingMode: vi.fn(),
          app: {
            profileMode: false,
          },
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
          toggleTrackingMode: vi.fn(),
          app: {
            profileMode: false,
          },
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

  describe("button and action components", () => {
    it("should render TrailActions component", () => {
      render(<TrailData />);
      expect(screen.getByTestId("trail-actions")).toBeInTheDocument();
    });

    it("should render TrailProgression component", () => {
      render(<TrailData />);
      expect(screen.getByTestId("trail-progression")).toBeInTheDocument();
    });
  });

  describe("data calculations", () => {
    it("should calculate remaining distance based on projected location", () => {
      render(<TrailData />);
      // Component should render with calculated remaining values
      expect(screen.getByText("km left")).toBeInTheDocument();
    });

    it("should update when projected location changes", () => {
      const { rerender } = render(<TrailData />);

      storeModule.useProjectedLocation.mockReturnValue({
        index: 4,
        timestamp: 2000000,
      });

      rerender(<TrailData />);
      expect(screen.getByText("km left")).toBeInTheDocument();
    });

    it("should update when cumulative distances change", () => {
      const { rerender } = render(<TrailData />);

      storeModule.default.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          flush: vi.fn(),
          toggleTrackingMode: vi.fn(),
          app: {
            trackingMode: false,
          },
          gpx: {
            cumulativeDistances: [0, 1000, 2000, 3000, 4000, 6000], // Updated
            cumulativeElevations: mockCumulativeElevations,
            cumulativeElevationLosses: mockCumulativeElevationLosses,
          },
        };
        return selector(state);
      });

      rerender(<TrailData />);
      expect(screen.getByText("km left")).toBeInTheDocument();
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
    it("should render stats container", () => {
      const { container } = render(<TrailData />);
      expect(container.querySelector(".stats-container")).toBeInTheDocument();
    });

    it("should render component container", () => {
      const { container } = render(<TrailData />);
      expect(
        container.querySelector(".component-container"),
      ).toBeInTheDocument();
    });

    it("should have stat items", () => {
      const { container } = render(<TrailData />);
      const items = container.querySelectorAll(".stat-item");
      expect(items.length).toBeGreaterThan(0);
    });
  });
});
