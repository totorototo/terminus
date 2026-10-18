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
    setPlanFile: vi.fn(),
    reprocessGPXFile: vi.fn(),
    broadcastPaceSettings: vi.fn(),
    readPlanFile: vi.fn().mockResolvedValue(PLAN_SETTINGS),
    ...overrides,
  };
  useStore.mockImplementation((selector) => selector(state));
  return state;
}

const planFile = () => ({
  name: "race.plan.json",
  arrayBuffer: async () => new Uint8Array([123, 125]).buffer,
});

describe("StoryPace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the pickers and offers a plan.json", () => {
    mockStore();
    render(<StoryPace />);
    expect(
      screen.getByRole("radiogroup", { name: "Runner profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /plan.json from Regimen/ }),
    ).toBeInTheDocument();
  });

  it("applies a plan.json's model, then reprocesses and tells the followers", async () => {
    const state = mockStore();
    render(<StoryPace />);
    fireEvent.change(screen.getByTestId("plan-input"), {
      target: { files: [planFile()] },
    });

    await waitFor(() =>
      expect(state.setPaceSettings).toHaveBeenCalledWith(PLAN_SETTINGS),
    );
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

  it("with a plan.json, shows its model instead of the pickers, and can go back", () => {
    const state = mockStore({
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
    fireEvent.click(
      screen.getByRole("button", { name: "Use the pickers instead" }),
    );
    expect(state.setPlanFile).toHaveBeenCalledWith(null);
  });

  it("a follower sees the synced pickers, never the runner's plan.json", () => {
    mockStore({
      app: {
        paceSettings: PLAN_SETTINGS,
        planFile: { name: "race.plan.json" },
      },
      gps: { followerConnectionStatus: "connected" },
    });
    render(<StoryPace />);
    expect(
      screen.getByRole("radiogroup", { name: "Runner profile" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("plan-input")).toBeNull();
    expect(screen.getByText(/Synced from the runner/)).toBeInTheDocument();
  });
});
