import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCheckpointETAs } from "../../../hooks/useCheckpointETAs.js";
import * as storeModule from "../../../store/store.js";
import StoryFueling from "./StoryFueling.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
}));

vi.mock("../../../hooks/useCheckpointETAs.js", () => ({
  useCheckpointETAs: vi.fn(),
}));

vi.mock("@react-spring/web", () => ({
  useSpring: vi.fn(() => ({})),
  animated: {
    div: ({ children, className }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

vi.mock("./StoryFueling.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../CollapseToggle.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../StorySection.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

const SECTIONS = [
  { startLocation: "Start", endLocation: "Ravito", endIndex: 1 },
  { startLocation: "Ravito", endLocation: "Col", endIndex: 2 },
  { startLocation: "Col", endLocation: "Vielle-Aure", endIndex: 3 },
];

const FUELING = {
  carbsGPerH: 60,
  fluidMlPerH: 500,
  sodiumMgPerH: 400,
  reserveS: 0,
  supplies: ["full", "water", "none", "none"],
  carry: [
    { fluidMl: 500, carbsG: 180, sodiumMg: 1200 },
    { fluidMl: 1000, carbsG: null, sodiumMg: null },
    null,
    null,
  ],
  times: [
    { arrivalS: 0, departureS: 0 },
    { arrivalS: 3600, departureS: 4200 },
    { arrivalS: 7800, departureS: 7800 },
    { arrivalS: 11400, departureS: 11400 },
  ],
};

function mockStore({ fueling = FUELING, isFollower = false } = {}) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      sections: SECTIONS,
      gpx: { cumulativeDistances: [0, 8000, 15000, 21000] },
      app: { fueling },
      gps: { followerConnectionStatus: isFollower ? "connected" : "idle" },
    }),
  );
}

describe("StoryFueling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCheckpointETAs.mockReturnValue({
      checkpointETAs: SECTIONS.map(() => ({ isPast: false })),
      hasGPSLock: false,
    });
    mockStore();
  });

  it("lists every plan entry, refills or not", () => {
    render(<StoryFueling />);
    const rows = screen.getAllByTestId("fueling-row");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("Full refill")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Water")).toBeInTheDocument();
    expect(within(rows[2]).getByText("No refill")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Finish")).toBeInTheDocument();
  });

  it("shows what to leave with, and the intake on the way at the plan's times", () => {
    render(<StoryFueling />);
    const rows = screen.getAllByTestId("fueling-row");
    expect(
      within(rows[0]).getByText("180 g carbs · 500 ml · 1.2 g sodium"),
    ).toBeInTheDocument();
    // 1 h at 60 g, 500 ml, 400 mg into the Ravito, then a 10 min stop.
    expect(
      within(rows[1]).getByText("60 g carbs · 500 ml · 400 mg sodium"),
    ).toBeInTheDocument();
    expect(within(rows[1]).getByText("+1h00")).toBeInTheDocument();
    expect(within(rows[1]).getByText("10m")).toBeInTheDocument();
    expect(
      within(rows[1]).getByText(/water only, keep your food/),
    ).toBeInTheDocument();
    expect(within(rows[2]).queryByText("Leave with")).not.toBeInTheDocument();
  });

  it("totals the race at the plan's finish", () => {
    render(<StoryFueling />);
    const totals = screen.getByTestId("fueling-totals");
    // 3h10 at the hourly targets, rounded up.
    expect(within(totals).getByText("190 g")).toBeInTheDocument();
    expect(within(totals).getByText("1.6 L")).toBeInTheDocument();
    expect(within(totals).getByText("1.3 g")).toBeInTheDocument();
    expect(within(totals).getByText("3h 10m")).toBeInTheDocument();
  });

  it("keeps the refills without the plan's times, with no totals", () => {
    mockStore({ fueling: { ...FUELING, times: undefined } });
    render(<StoryFueling />);
    expect(screen.queryByTestId("fueling-totals")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("fueling-row")).toHaveLength(4);
    expect(screen.queryByText("On the way")).not.toBeInTheDocument();
  });

  it("dims the points already passed", () => {
    useCheckpointETAs.mockReturnValue({
      checkpointETAs: [{ isPast: true }, { isPast: false }, { isPast: false }],
      hasGPSLock: true,
    });
    render(<StoryFueling />);
    const rows = screen.getAllByTestId("fueling-row");
    expect(rows[0]).toHaveClass("past");
    expect(rows[1]).toHaveClass("past");
    expect(rows[2]).toHaveClass("current");
  });

  it("says when the plan has no fueling", () => {
    mockStore({ fueling: null });
    render(<StoryFueling />);
    expect(screen.getByText(/has no fueling/)).toBeInTheDocument();
  });

  // The follower's own fueling is for another race: never shown.
  it("tells a follower fueling isn't shared, whatever this device holds", () => {
    for (const fueling of [FUELING, null]) {
      mockStore({ fueling, isFollower: true });
      const { unmount } = render(<StoryFueling />);
      expect(
        screen.getByText(/isn't shared with followers/),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("fueling-totals")).not.toBeInTheDocument();
      unmount();
    }
  });
});
