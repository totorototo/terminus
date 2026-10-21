import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import StoryNow from "./StoryNow.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("@react-spring/web", () => ({
  useSpring: vi.fn((values) => ({
    remainingKm: { to: (fn) => fn(values.remainingKm) },
  })),
  animated: {
    div: ({ children, className, style }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
    span: ({ children, style }) => <span style={style}>{children}</span>,
  },
}));

vi.mock("date-fns", () => ({
  format: () => "Thu 14:30",
}));

vi.mock("./StoryNow.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../StorySection.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("StoryNow", () => {
  const mockCumulativeDistances = [0, 1000, 2000, 3000, 4000, 5000];
  const mockSections = [
    {
      sectionId: 0,
      startTime: 1000,
      startIndex: 0,
      endIndex: 2,
      totalDistance: 2000,
      estimatedDuration: 500,
    },
    {
      sectionId: 1,
      startTime: 2000,
      startIndex: 2,
      endIndex: 5,
      totalDistance: 3000,
      estimatedDuration: 1000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    storeModule.default.mockImplementation((selector) =>
      selector({
        sections: mockSections,
        gpx: { cumulativeDistances: mockCumulativeDistances },
        gps: { autoShareEnabled: false },
        toggleAutoShare: vi.fn(),
      }),
    );
    storeModule.useProjectedLocation.mockReturnValue({
      index: 2,
      timestamp: 1_500_000,
    });
  });

  it("renders without errors", () => {
    const { container } = render(<StoryNow />);
    expect(container).toBeInTheDocument();
  });

  it("shows km left, eta, remaining, and vs plan labels", () => {
    render(<StoryNow />);
    expect(screen.getByText("km left")).toBeInTheDocument();
    expect(screen.getByText("eta")).toBeInTheDocument();
    expect(screen.getByText("remaining")).toBeInTheDocument();
    expect(screen.getByText("vs plan")).toBeInTheDocument();
  });

  it("shows a placeholder for vs plan before the race has started", () => {
    storeModule.useProjectedLocation.mockReturnValue({
      index: 0,
      timestamp: 0,
    });

    render(<StoryNow />);
    const vsPlanValue = screen.getByText("vs plan").previousSibling;
    expect(vsPlanValue).toHaveTextContent("--");
  });

  it("tones vs plan behind when slower than plan", () => {
    storeModule.useProjectedLocation.mockReturnValue({
      index: 2,
      timestamp: 1_600_000,
    });
    render(<StoryNow />);
    const vsPlanValue = screen.getByText("vs plan").previousSibling;
    expect(vsPlanValue.textContent).toMatch(/^\+/);
    expect(vsPlanValue).toHaveAttribute("data-tone", "behind");
  });

  it("tones vs plan ahead when faster than plan", () => {
    storeModule.useProjectedLocation.mockReturnValue({
      index: 2,
      timestamp: 1_400_000,
    });
    render(<StoryNow />);
    const vsPlanValue = screen.getByText("vs plan").previousSibling;
    expect(vsPlanValue.textContent).toMatch(/^-/);
    expect(vsPlanValue).toHaveAttribute("data-tone", "ahead");
  });

  it("leaves the live figures untoned", () => {
    render(<StoryNow />);
    expect(screen.getByText("km left").previousSibling).not.toHaveAttribute(
      "data-tone",
    );
  });

  it("shows a spot-me control that calls toggleAutoShare", () => {
    const toggleAutoShare = vi.fn();
    storeModule.default.mockImplementation((selector) =>
      selector({
        sections: mockSections,
        gpx: { cumulativeDistances: mockCumulativeDistances },
        gps: { autoShareEnabled: false },
        toggleAutoShare,
      }),
    );

    render(<StoryNow />);
    const button = screen.getByRole("button", { name: /spot me/i });
    button.click();
    expect(toggleAutoShare).toHaveBeenCalled();
  });

  it("shows GPS-on state once auto-share is enabled", () => {
    storeModule.default.mockImplementation((selector) =>
      selector({
        sections: mockSections,
        gpx: { cumulativeDistances: mockCumulativeDistances },
        gps: { autoShareEnabled: true },
        toggleAutoShare: vi.fn(),
      }),
    );

    render(<StoryNow />);
    expect(
      screen.getByRole("button", { name: /gps on/i, pressed: true }),
    ).toBeInTheDocument();
  });

  it("counts the whole route left, and claims no live fix, before there is one", () => {
    storeModule.useProjectedLocation.mockReturnValue({
      index: 0,
      timestamp: 0,
    });

    render(<StoryNow />);
    expect(screen.getByText("km left").previousSibling).toHaveTextContent(
      "5.0",
    );
    expect(screen.queryByTestId("live-badge")).toBeNull();
  });

  it("counts what is left from the fix, and shows it live", () => {
    render(<StoryNow />);
    expect(screen.getByText("km left").previousSibling).toHaveTextContent(
      "3.0",
    );
    expect(screen.getByTestId("live-badge")).toBeInTheDocument();
  });

  it("falls back to placeholders before the race has started", () => {
    storeModule.useProjectedLocation.mockReturnValue({
      index: 0,
      timestamp: 0,
    });

    render(<StoryNow />);
    expect(screen.getByText("--:--")).toBeInTheDocument();
  });

  it("refers to the runner in third person when following", () => {
    storeModule.default.mockImplementation((selector) =>
      selector({
        sections: mockSections,
        gpx: { cumulativeDistances: mockCumulativeDistances },
        gps: {
          autoShareEnabled: false,
          followerConnectionStatus: "connected",
        },
        toggleAutoShare: vi.fn(),
      }),
    );

    render(<StoryNow />);
    expect(
      screen.getByRole("heading", { name: "Where they are" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Based on their pace so far against terrain."),
    ).toBeInTheDocument();
  });

  describe("the plan's fueling", () => {
    const fueling = {
      carbsGPerH: 70,
      fluidMlPerH: 500,
      sodiumMgPerH: 400,
      reserveS: 1800,
      supplies: ["full", "water", "none"],
      carry: [
        { fluidMl: 1650, carbsG: 455, sodiumMg: 2600 },
        { fluidMl: 900, carbsG: null, sodiumMg: null },
        null,
      ],
    };

    const mockFuelingStore = (value) =>
      storeModule.default.mockImplementation((selector) =>
        selector({
          sections: mockSections.map((section, i) => ({
            ...section,
            endLocation: ["Ravito", "Finish"][i],
          })),
          gpx: { cumulativeDistances: mockCumulativeDistances },
          gps: { autoShareEnabled: false },
          toggleAutoShare: vi.fn(),
          app: { fueling: value },
        }),
      );

    it("says what to leave the start with before there is a fix", () => {
      mockFuelingStore(fueling);
      storeModule.useProjectedLocation.mockReturnValue({
        index: 0,
        timestamp: 0,
      });
      render(<StoryNow />);
      expect(screen.getByTestId("now-fuel")).toHaveTextContent(
        "Leave the start with 455 g carbs · 1.65 L · 2.6 g sodium, as planned.",
      );
    });

    it("names the next refill ahead once there is a fix", () => {
      mockFuelingStore(fueling);
      storeModule.useProjectedLocation.mockReturnValue({
        index: 1,
        timestamp: 1_500_000,
      });
      render(<StoryNow />);
      expect(screen.getByTestId("now-fuel")).toHaveTextContent(
        "Next refill: Ravito (water). Leave it with 900 ml, as planned.",
      );
    });

    it("shows nothing without fueling, or past the last refill", () => {
      mockFuelingStore(null);
      render(<StoryNow />);
      expect(screen.queryByTestId("now-fuel")).toBeNull();
    });
  });
});
