import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useStore from "../../../store/store.js";
import StoryPace from "./StoryPace.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  DEFAULT_PACE_SETTINGS: {
    basePaceSPerKm: 500,
    kFatigue: 0.002,
    lifeBaseStopS: 3600,
  },
}));

vi.mock("./StoryPace.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../StorySection.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// The chart reads the trace; the pickers and the plan.json are what's tested.
vi.mock("../../trailData/PaceProfile/PaceProfile.jsx", () => ({
  default: () => null,
}));

const PLAN_SETTINGS = {
  basePaceSPerKm: 450,
  kFatigue: 0.003,
  lifeBaseStopS: 0,
};

function mockStore(overrides = {}) {
  const state = {
    app: {
      paceSettings: {
        basePaceSPerKm: 500,
        kFatigue: 0.002,
        lifeBaseStopS: 3600,
      },
      planFile: null,
    },
    gps: { followerConnectionStatus: "disconnected" },
    setPaceSettings: vi.fn(),
    setFueling: vi.fn(),
    setPlanFile: vi.fn(),
    reprocessGPXFile: vi.fn(),
    broadcastPaceSettings: vi.fn(),
    readPlanFile: vi
      .fn()
      .mockResolvedValue({ paceSettings: PLAN_SETTINGS, fueling: null }),
    ...overrides,
  };
  useStore.mockImplementation((selector) => selector(state));
  return state;
}

const planFile = () => ({
  name: "race.plan.json",
  size: 2,
  arrayBuffer: async () => new Uint8Array([123, 125]).buffer,
});

describe("StoryPace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the plan.json's model, and no pickers", () => {
    mockStore({
      app: {
        paceSettings: PLAN_SETTINGS,
        planFile: { name: "race.plan.json" },
      },
    });
    render(<StoryPace />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByTestId("plan-model")).toHaveTextContent(
      "7:30/km flat · fatigue 0.003 · no stop at LifeBases",
    );
    expect(screen.getByText(/From race.plan.json/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replace plan.json" }),
    ).toBeInTheDocument();
  });

  it("shows the plan's fueling targets under its model", () => {
    mockStore({
      app: {
        paceSettings: PLAN_SETTINGS,
        planFile: { name: "race.plan.json" },
        fueling: {
          carbsGPerH: 70,
          fluidMlPerH: 500,
          sodiumMgPerH: 400,
          reserveS: 1800,
          supplies: ["full", "none"],
          carry: [{ fluidMl: 1000, carbsG: 140, sodiumMg: 800 }, null],
        },
      },
    });
    render(<StoryPace />);
    expect(screen.getByTestId("plan-fueling")).toHaveTextContent(
      "70 g carbs · 500 ml fluid · 400 mg sodium per hour · 30 min reserve",
    );
  });

  it("replaces the plan.json, then reprocesses and tells the followers", async () => {
    const state = mockStore({
      app: {
        paceSettings: PLAN_SETTINGS,
        planFile: { name: "race.plan.json" },
      },
    });
    render(<StoryPace />);
    fireEvent.change(screen.getByTestId("plan-input"), {
      target: { files: [planFile()] },
    });

    await waitFor(() =>
      expect(state.setPaceSettings).toHaveBeenCalledWith(PLAN_SETTINGS),
    );
    // A plan without fueling clears the previous plan's.
    expect(state.setFueling).toHaveBeenCalledWith(null);
    // Checked against the route the worker holds: no GPX bytes passed.
    expect(state.readPlanFile).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(state.setPlanFile).toHaveBeenCalledWith({ name: "race.plan.json" });
    expect(state.reprocessGPXFile).toHaveBeenCalled();
    expect(state.broadcastPaceSettings).toHaveBeenCalled();
  });

  it("explains a plan.json made for another route, and changes nothing", async () => {
    const state = mockStore({
      readPlanFile: vi.fn().mockRejectedValue(new Error("Course mismatch")),
    });
    render(<StoryPace />);
    fireEvent.change(screen.getByTestId("plan-input"), {
      target: { files: [planFile()] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "made for another GPX",
    );
    expect(state.setPaceSettings).not.toHaveBeenCalled();
    expect(state.setPlanFile).not.toHaveBeenCalled();
  });

  it("refuses a file that is not a plan.json before reading it", async () => {
    const state = mockStore();
    render(<StoryPace />);
    const notes = {
      name: "notes.txt",
      size: 3,
      arrayBuffer: async () => new ArrayBuffer(3),
    };
    fireEvent.change(screen.getByTestId("plan-input"), {
      target: { files: [notes] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose the race's plan.json.",
    );
    expect(state.readPlanFile).not.toHaveBeenCalled();
  });

  it("asks for a plan.json on a race opened without one", () => {
    mockStore();
    render(<StoryPace />);
    expect(
      screen.getByText(/No plan.json for this race yet/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open the plan.json" }),
    ).toBeInTheDocument();
  });

  it("a follower sees the runner's synced model, and can't replace it", () => {
    mockStore({
      app: {
        paceSettings: PLAN_SETTINGS,
        planFile: { name: "race.plan.json" },
      },
      gps: { followerConnectionStatus: "connected" },
    });
    render(<StoryPace />);
    expect(screen.getByTestId("plan-model")).toHaveTextContent("7:30/km flat");
    expect(screen.getByText(/Synced from the runner/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /plan.json/ })).toBeNull();
  });
});
