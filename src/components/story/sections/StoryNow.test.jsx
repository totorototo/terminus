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

  it("shows km left, eta, and remaining labels", () => {
    render(<StoryNow />);
    expect(screen.getByText("km left")).toBeInTheDocument();
    expect(screen.getByText("eta")).toBeInTheDocument();
    expect(screen.getByText("remaining")).toBeInTheDocument();
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
});
