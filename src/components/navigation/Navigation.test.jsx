import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Navigation from "./Navigation.jsx";
import useStore from "../../store/store.js";
import * as hooks from "../../store/store.js";

// Mock the store and hooks
vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

// Mock react-spring to avoid animation complexity
vi.mock("@react-spring/web", () => ({
  useSpring: vi.fn((values) => ({
    distance: {
      to: (fn) => fn(values.distance),
    },
    elevation: {
      to: (fn) => fn(values.elevation),
    },
    elevationLoss: {
      to: (fn) => fn(values.elevationLoss),
    },
  })),
  useTransition: vi.fn((items, config) => {
    return (fn) =>
      items.map((item, idx) =>
        fn(
          {
            height: config.enter.height,
            transform: config.enter.transform,
          },
          item,
          {},
          idx,
        ),
      );
  }),
  animated: {
    div: ({ children, className, style }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
}));

// Mock styled icons
vi.mock("@styled-icons/feather", () => ({
  ArrowUp: ({ size, ...props }) => <div data-icon="arrow-up" {...props} />,
  ArrowDown: ({ size, ...props }) => <div data-icon="arrow-down" {...props} />,
  CornerUpLeft: ({ size, ...props }) => (
    <div data-icon="corner-up-left" {...props} />
  ),
  CornerUpRight: ({ size, ...props }) => (
    <div data-icon="corner-up-right" {...props} />
  ),
  Clock: ({ size, ...props }) => <div data-icon="clock" {...props} />,
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  format: () => "Monday 14:30",
}));

// Mock Navigation.style
vi.mock("./Navigation.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("Navigation Component", () => {
  const mockSections = [
    {
      segmentId: "seg1",
      startIndex: 0,
      endIndex: 100,
      bearing: 0,
      endLocation: "Location 1",
      endTime: 1000000,
      totalDistance: 5000,
      totalElevation: 500,
      totalElevationLoss: 200,
    },
    {
      segmentId: "seg2",
      startIndex: 100,
      endIndex: 200,
      bearing: 90,
      endLocation: "Location 2",
      endTime: 2000000,
      totalDistance: 10000,
      totalElevation: 1000,
      totalElevationLoss: 400,
    },
    {
      segmentId: "seg3",
      startIndex: 200,
      endIndex: 300,
      bearing: 180,
      endLocation: "Location 3",
      endTime: 3000000,
      totalDistance: 15000,
      totalElevation: 1500,
      totalElevationLoss: 600,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering sections", () => {
    it("should render all remaining sections", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: [0, 5000, 15000, 30000],
            cumulativeElevations: [0, 500, 1500, 3000],
            cumulativeElevationLosses: [0, 200, 600, 1200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      render(<Navigation />);

      expect(screen.getByText("Location 1")).toBeInTheDocument();
      expect(screen.getByText("Location 2")).toBeInTheDocument();
      expect(screen.getByText("Location 3")).toBeInTheDocument();
    });

    it("should filter sections based on current position", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: [0, 5000, 15000, 30000],
            cumulativeElevations: [0, 500, 1500, 3000],
            cumulativeElevationLosses: [0, 200, 600, 1200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 150 });

      render(<Navigation />);

      // Only sections with endIndex >= 150 should be shown
      expect(screen.getByText("Location 2")).toBeInTheDocument();
      expect(screen.getByText("Location 3")).toBeInTheDocument();
      expect(screen.queryByText("Location 1")).not.toBeInTheDocument();
    });

    it("should render nothing when no sections remain", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: [0, 5000, 15000, 30000],
            cumulativeElevations: [0, 500, 1500, 3000],
            cumulativeElevationLosses: [0, 200, 600, 1200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 500 });

      render(<Navigation />);

      expect(screen.queryByText("Location 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Location 2")).not.toBeInTheDocument();
      expect(screen.queryByText("Location 3")).not.toBeInTheDocument();
    });

    it("should handle empty sections array", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: [],
          gpx: {
            cumulativeDistances: [],
            cumulativeElevations: [],
            cumulativeElevationLosses: [],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      render(<Navigation />);

      // Should render without error, just empty
      expect(screen.queryByText(/Location/)).not.toBeInTheDocument();
    });
  });

  describe("bearing to arrow icon", () => {
    it("should show correct arrow icon for North bearing", () => {
      const northSections = [
        { ...mockSections[0], bearing: 0, segmentId: "north" },
      ];

      useStore.mockImplementation((selector) => {
        const state = {
          sections: northSections,
          gpx: {
            cumulativeDistances: [0, 5000],
            cumulativeElevations: [0, 500],
            cumulativeElevationLosses: [0, 200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      const { container } = render(<Navigation />);

      expect(
        container.querySelector('[data-icon="arrow-up"]'),
      ).toBeInTheDocument();
    });

    it("should show correct arrow icon for South bearing", () => {
      const southSections = [
        { ...mockSections[2], bearing: 180, segmentId: "south" },
      ];

      useStore.mockImplementation((selector) => {
        const state = {
          sections: southSections,
          gpx: {
            cumulativeDistances: [0, 5000],
            cumulativeElevations: [0, 500],
            cumulativeElevationLosses: [0, 200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      const { container } = render(<Navigation />);

      expect(
        container.querySelector('[data-icon="arrow-down"]'),
      ).toBeInTheDocument();
    });

    it("should show correct arrow icon for East bearing", () => {
      const eastSections = [
        { ...mockSections[1], bearing: 90, segmentId: "east" },
      ];

      useStore.mockImplementation((selector) => {
        const state = {
          sections: eastSections,
          gpx: {
            cumulativeDistances: [0, 5000],
            cumulativeElevations: [0, 500],
            cumulativeElevationLosses: [0, 200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      const { container } = render(<Navigation />);

      expect(
        container.querySelector('[data-icon="corner-up-right"]'),
      ).toBeInTheDocument();
    });

    it("should show correct arrow icon for West bearing", () => {
      const westSections = [
        { ...mockSections[0], bearing: 270, segmentId: "west" },
      ];

      useStore.mockImplementation((selector) => {
        const state = {
          sections: westSections,
          gpx: {
            cumulativeDistances: [0, 5000],
            cumulativeElevations: [0, 500],
            cumulativeElevationLosses: [0, 200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      const { container } = render(<Navigation />);

      expect(
        container.querySelector('[data-icon="corner-up-left"]'),
      ).toBeInTheDocument();
    });
  });

  describe("current section highlighting", () => {
    it("should mark first section as current", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: [0, 5000, 15000, 30000],
            cumulativeElevations: [0, 500, 1500, 3000],
            cumulativeElevationLosses: [0, 200, 600, 1200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      const { container } = render(<Navigation />);

      const currentSection = container.querySelector("div.section.current");
      expect(currentSection).toBeInTheDocument();
    });
  });

  describe("distance and elevation display", () => {
    it("should display location name for each section", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: [0, 5000, 15000, 30000],
            cumulativeElevations: [0, 500, 1500, 3000],
            cumulativeElevationLosses: [0, 200, 600, 1200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      render(<Navigation />);

      expect(screen.getByText("Location 1")).toBeInTheDocument();
      expect(screen.getByText("Location 2")).toBeInTheDocument();
      expect(screen.getByText("Location 3")).toBeInTheDocument();
    });

    it("should display cutoff time for sections", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: [0, 5000, 15000, 30000],
            cumulativeElevations: [0, 500, 1500, 3000],
            cumulativeElevationLosses: [0, 200, 600, 1200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      render(<Navigation />);

      // The mocked format returns "Monday 14:30"
      expect(screen.getAllByText(/Monday 14:30/)).toHaveLength(3);
    });
  });

  describe("null/undefined handling", () => {
    it("should handle missing projected location gracefully", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: [0, 5000, 15000, 30000],
            cumulativeElevations: [0, 500, 1500, 3000],
            cumulativeElevationLosses: [0, 200, 600, 1200],
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({});

      render(<Navigation />);

      // Should treat index as 0 and show all sections
      expect(screen.getByText("Location 1")).toBeInTheDocument();
    });

    it("should handle missing cumulative data", () => {
      useStore.mockImplementation((selector) => {
        const state = {
          sections: mockSections,
          gpx: {
            cumulativeDistances: undefined,
            cumulativeElevations: undefined,
            cumulativeElevationLosses: undefined,
          },
        };
        return selector(state);
      });

      hooks.useProjectedLocation.mockReturnValue({ index: 0 });

      render(<Navigation />);

      // Should render sections but with 0 values
      expect(screen.getByText("Location 1")).toBeInTheDocument();
    });
  });
});
