import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import StoryHero from "./StoryHero.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useStats: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("./StoryHero.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// ── Fixtures ────────────────────────────────────────────────────────────────
// Mirrors the fixture shape used by useCheckpointETAs.test.js: 6-point trace,
// race start at t=1_000_000s, two checkpoint-to-checkpoint sections.

const START_TIME = 1_000_000; // unix seconds
const RACE_START_MS = START_TIME * 1000;
const CUMULATIVE_DISTANCES = [0, 1000, 2000, 3000, 4000, 5000];
const COORDINATES = [
  [45, 6, 100],
  [45.01, 6.01, 150],
  [45.02, 6.02, 200],
  [45.03, 6.03, 250],
  [45.04, 6.04, 300],
  [45.05, 6.05, 350],
];

const SECTION_1 = {
  sectionId: 0,
  startIndex: 0,
  endIndex: 2,
  startTime: START_TIME,
  endLocation: "Checkpoint 1",
  totalDistance: 2000,
  estimatedDuration: 500, // 500s Minetti estimate
  difficulty: 1,
  maxCompletionTime: null,
};

const SECTION_2 = {
  sectionId: 1,
  startIndex: 2,
  endIndex: 5,
  startTime: START_TIME + 500,
  endLocation: "Arrival",
  totalDistance: 3000,
  estimatedDuration: 1000, // 1000s Minetti estimate
  difficulty: 2,
  maxCompletionTime: null,
};

function setup({ sections, projectedLocation, stats }) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      sections,
      stats,
      gpx: { cumulativeDistances: CUMULATIVE_DISTANCES, data: COORDINATES },
      recalibration: { section: null, stage: null },
    }),
  );
  storeModule.useStats.mockReturnValue(stats);
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

describe("StoryHero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the naive Minetti total before any GPS fix", () => {
    setup({
      sections: [SECTION_1, SECTION_2],
      projectedLocation: { index: 0, timestamp: 0 },
      stats: { distance: 5000, elevationGain: 100, elevationLoss: 50 },
    });

    render(<StoryHero />);

    // (500 + 1000)s Minetti total = 1500s = 0h 25m.
    expect(screen.getByText("0h 25m")).toBeInTheDocument();
    expect(screen.getByText("est. time")).toBeInTheDocument();
  });

  // Regression test: the "est. time" stat used to be a standalone sum of
  // stages[].estimatedDuration, ignoring the live pace ratio, Zig
  // recalibration, and cutoff clamping that StoryCheckpoints applies — so it
  // silently drifted from the finish ETA shown as the last checkpoint. It
  // must now be derived from the same section-granularity checkpointETAs
  // array, since sections are the only boundary kind aware of every
  // intermediate TimeBarrier cutoff.
  it("reflects the live pace ratio, matching what StoryCheckpoints' last row would show", () => {
    // Runner reached section 1's end (index 2) at t = raceStart + 1000s —
    // twice the 500s Minetti prediction for that stretch, i.e. half pace.
    setup({
      sections: [SECTION_1, SECTION_2],
      projectedLocation: { index: 2, timestamp: RACE_START_MS + 1000 * 1000 },
      stats: { distance: 5000, elevationGain: 100, elevationLoss: 50 },
    });

    render(<StoryHero />);

    // paceRatio = 1000 / 500 = 2.0. Section 2 remaining = 1000s * 2.0 = 2000s.
    // Finish = (section 1 actual 1000s) + (section 2 scaled 2000s) = 3000s =
    // 0h 50m — not the naive (500+1000)s = 0h 25m a flat re-sum would show.
    expect(screen.getByText("0h 50m")).toBeInTheDocument();
    expect(screen.queryByText("0h 25m")).not.toBeInTheDocument();
  });
});
