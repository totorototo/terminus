import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import StoryStages from "./StoryStages.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("styled-components", async (importOriginal) => {
  const actual = await importOriginal();
  const { default: THEME } = await import("../../../theme/Theme.js");
  return { ...actual, useTheme: () => ({ ...THEME, currentVariant: "dark" }) };
});

vi.mock("../../../helpers/raceClock.js", () => ({
  formatRaceTime: (ms) => String(ms),
  raceClockNote: () => null,
  raceUtcOffset: () => null,
}));

vi.mock("./StoryStages.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../StorySection.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../CollapseToggle.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

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

// A single stage spanning the whole route, with no cutoff of its own — a
// stage only sees Start/LifeBase/Arrival, so it's blind to the TimeBarrier
// cutoff below.
const STAGE = {
  stageId: 0,
  startIndex: 0,
  endIndex: 5,
  startTime: START_TIME,
  endLocation: "Arrival",
  totalDistance: 5000,
  estimatedDuration: 1500,
  difficulty: 1,
  maxCompletionTime: null,
};

// Two sections: the first has a cutoff tighter than its own Minetti estimate
// (a TimeBarrier the runner is projected to miss) — something the single
// stage above cannot represent.
const SECTION_1 = {
  sectionId: 0,
  startIndex: 0,
  endIndex: 2,
  startTime: START_TIME,
  endLocation: "TimeBarrier 1",
  totalDistance: 2000,
  estimatedDuration: 500,
  difficulty: 1,
  maxCompletionTime: 400, // tighter than the 500s estimate -> breached
};
const SECTION_2 = {
  sectionId: 1,
  startIndex: 2,
  endIndex: 5,
  startTime: START_TIME + 500,
  endLocation: "Arrival",
  totalDistance: 3000,
  estimatedDuration: 1000,
  difficulty: 2,
  maxCompletionTime: null,
};

function setup() {
  storeModule.default.mockImplementation((selector) =>
    selector({
      stages: [STAGE],
      sections: [SECTION_1, SECTION_2],
      gpx: { cumulativeDistances: CUMULATIVE_DISTANCES, data: COORDINATES },
      recalibration: { section: null, stage: null },
    }),
  );
  storeModule.useProjectedLocation.mockReturnValue({ index: 0, timestamp: 0 });
}

describe("StoryStages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setup();
  });

  // The finish (Arrival) row reads the checkpoint chain's last ETA, so
  // Milestones, StoryCheckpoints and StoryHero share one finish. A missed
  // TimeBarrier no longer moves it: the ETA past a cutoff stays the model's.
  it("shows the checkpoint chain's finish, unmoved by a missed cutoff", () => {
    render(<StoryStages />);

    // Section 1 (500s, over its 400s cutoff) + section 2 (1000s) = 1500s.
    const finishMs = RACE_START_MS + 1500 * 1000;
    // Pinning section 1 to its cutoff would have read raceStart + 1400s.
    const pinnedFinishMs = RACE_START_MS + 1400 * 1000;

    expect(screen.getByText(String(finishMs))).toBeInTheDocument();
    expect(screen.queryByText(String(pinnedFinishMs))).not.toBeInTheDocument();
  });
});
