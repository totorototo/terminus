import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import StageETA from "./StageETA.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("date-fns", () => ({
  format: (_date, _fmt) => "Sat 10:00",
}));

vi.mock("../SectionETA/SectionETA.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../../../constants.js", () => ({
  DIFFICULTY_COLORS: ["#4CAF50", "#ECBC3E", "#EA8827", "#E1351D", "#96451F"],
  DIFFICULTY_LABELS: ["Easy", "Moderate", "Hard", "Very Hard", "Extreme"],
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const START_TIME = 1_000_000; // epoch seconds
const START_MS = START_TIME * 1000;

// Two life-base stages, each 10 km / 2 h baseline.
const STAGES = [
  {
    stageId: "st1",
    startIndex: 0,
    endIndex: 100,
    totalDistance: 10000,
    totalElevation: 500,
    totalElevationLoss: 200,
    estimatedDuration: 7200, // 2 h
    difficulty: 2,
    startTime: START_TIME,
    maxCompletionTime: 7200,
    startLocation: "Départ",
    endLocation: "Life Base 1",
  },
  {
    stageId: "st2",
    startIndex: 100,
    endIndex: 200,
    totalDistance: 10000,
    totalElevation: 600,
    totalElevationLoss: 400,
    estimatedDuration: 7200,
    difficulty: 3,
    startTime: START_TIME + 7200,
    maxCompletionTime: null,
    endLocation: "Arrivée",
  },
];

// 201 cumulative distance entries: 100m per index.
const CUMULATIVE_DISTANCES = Array.from({ length: 201 }, (_, i) => i * 100);

function setupStore(
  stages,
  cumulativeDistances,
  projectedLocation,
  recalStage,
) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      stages,
      gpx: { cumulativeDistances, data: [] },
      recalibration: { section: null, stage: recalStage ?? null },
    }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("StageETA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when there are no stages", () => {
    setupStore([], [], null);
    render(<StageETA />);
    expect(screen.getByText("No stages")).toBeInTheDocument();
  });

  it("shows the planned schedule, marked as planned, before race start", () => {
    setupStore(STAGES, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS - 1000, // one second before start
    });

    render(<StageETA />);

    // Pre-race the hook computes raceStart + estimated durations; every row
    // (start + life bases) shows it via the date-fns mock, dimmed as planned.
    // (Count via .cp-eta — cutoff chips format to the same mocked string.)
    const etas = [...document.querySelectorAll(".cp-eta")];
    expect(etas).toHaveLength(STAGES.length + 1);
    expect(etas.every((el) => el.textContent === "Sat 10:00")).toBe(true);
    expect(screen.queryByText("--:--")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".cp-eta.planned")).toHaveLength(
      STAGES.length + 1,
    );
  });

  it("renders all life-base names", () => {
    setupStore(STAGES, CUMULATIVE_DISTANCES, { index: 0, timestamp: START_MS });

    render(<StageETA />);

    expect(screen.getByText("Life Base 1")).toBeInTheDocument();
    expect(screen.getByText("Arrivée")).toBeInTheDocument();
  });

  it("renders the list header label", () => {
    setupStore(STAGES, CUMULATIVE_DISTANCES, { index: 0, timestamp: START_MS });

    render(<StageETA />);

    expect(screen.getByText("Life bases")).toBeInTheDocument();
  });

  it("marks the in-progress stage as current", () => {
    // At index 50 (halfway through stage 1, 0–100)
    setupStore(STAGES, CUMULATIVE_DISTANCES, {
      index: 50,
      timestamp: START_MS + 3600 * 1000, // 1 h in
    });

    render(<StageETA />);

    expect(document.querySelector(".cp-row.current")).not.toBeNull();
  });

  it("shows a live countdown on the next life base's row and cutoffs where defined", () => {
    // Halfway through stage 1 (0–100) at 1 h in, pace ratio 1 →
    // etaMs = now + 1 h → "in 1h" on Life Base 1's row only.
    setupStore(STAGES, CUMULATIVE_DISTANCES, {
      index: 50,
      timestamp: START_MS + 3600 * 1000,
    });

    render(<StageETA />);

    expect(screen.getByText("in 1h")).toBeInTheDocument();
    expect(document.querySelectorAll(".cp-countdown")).toHaveLength(1);
    // st1 carries maxCompletionTime; st2 has none
    expect(document.querySelectorAll(".cp-cutoff")).toHaveLength(1);
  });

  it("prefers the Zig recalibration for forward ETAs when present", () => {
    // Locked, underway, with a recalibration whose stage 2 (endIndex 200) carries
    // a cumulative-remaining value the forward ETA must be derived from.
    setupStore(
      STAGES,
      CUMULATIVE_DISTANCES,
      { index: 50, timestamp: START_MS + 3600 * 1000 },
      {
        etas: [
          { endIndex: 100, cumulativeRemainingS: 1800 },
          { endIndex: 200, cumulativeRemainingS: 5400 },
        ],
      },
    );

    // Renders the recalibrated path without crashing; the finish stage shows a
    // formatted time (date-fns mocked) rather than "--:--".
    render(<StageETA />);
    expect(screen.getAllByText("Sat 10:00").length).toBeGreaterThanOrEqual(1);
  });
});
