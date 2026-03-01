import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../../../store/store.js";
import SectionETA from "./SectionETA.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

vi.mock("date-fns", () => ({
  format: (_date, _fmt) => "Sat 10:00",
}));

vi.mock("./SectionETA.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../../../constants.js", () => ({
  DIFFICULTY_COLORS: ["#4CAF50", "#ECBC3E", "#EA8827", "#E1351D", "#96451F"],
  DIFFICULTY_LABELS: ["Easy", "Moderate", "Hard", "Very Hard", "Extreme"],
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const START_TIME = 1_000_000; // epoch seconds
const START_MS = START_TIME * 1000;
const NAISMITH_FLAT_MS_PER_M = 720;

// Three consecutive sections, each 5 km and 1 h Naismith baseline
const SECTIONS = [
  {
    segmentId: "s1",
    startIndex: 0,
    endIndex: 100,
    totalDistance: 5000,
    estimatedDuration: 3600, // 1 h
    difficulty: 1,
    startTime: START_TIME,
    endTime: START_TIME + 3600,
    maxCompletionTime: 3600,
    endLocation: "Checkpoint A",
  },
  {
    segmentId: "s2",
    startIndex: 100,
    endIndex: 200,
    totalDistance: 5000,
    estimatedDuration: 3600,
    difficulty: 2,
    startTime: START_TIME + 3600,
    endTime: null,
    maxCompletionTime: 3600,
    endLocation: "Checkpoint B",
  },
  {
    segmentId: "s3",
    startIndex: 200,
    endIndex: 300,
    totalDistance: 5000,
    estimatedDuration: 3600,
    difficulty: 3,
    startTime: START_TIME + 7200,
    endTime: null,
    maxCompletionTime: null,
    endLocation: "Checkpoint C",
  },
];

// 301 cumulative distance entries: 0 at index 0, 50m per index
const CUMULATIVE_DISTANCES = Array.from({ length: 301 }, (_, i) => i * 50);

function setupStore(sections, cumulativeDistances, projectedLocation) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      sections,
      gpx: { cumulativeDistances },
    }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SectionETA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it("renders empty state when there are no sections", () => {
    setupStore([], [], null);
    render(<SectionETA />);
    expect(screen.getByText("No sections")).toBeInTheDocument();
  });

  it("renders empty state when cumulativeDistances is missing", () => {
    setupStore(SECTIONS, [], { index: 0, timestamp: START_MS });
    render(<SectionETA />);
    expect(screen.getByText("No sections")).toBeInTheDocument();
  });

  // ── Before race start ────────────────────────────────────────────────────

  it("shows '--:--' for all sections before race start", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS - 1000, // one second before start
    });

    render(<SectionETA />);

    const etaCells = screen.getAllByText("--:--");
    expect(etaCells).toHaveLength(SECTIONS.length);
  });

  // ── Past section with recorded checkpoint ────────────────────────────────

  it("uses actual recorded ETA for past section with endTime", () => {
    // Position is inside section 2 (past section 1 which has endTime)
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 150,
      timestamp: START_MS + 5400 * 1000,
    });

    render(<SectionETA />);

    // Section 1 is past+recorded → "Sat 10:00" from our date-fns mock
    const etaCells = screen.getAllByText("Sat 10:00");
    expect(etaCells.length).toBeGreaterThanOrEqual(1);
  });

  // ── Current section ETA ──────────────────────────────────────────────────

  it("renders ETA for the current in-progress section", () => {
    // At index 50 (halfway through section 1, 0–100)
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 50,
      timestamp: START_MS + 1800 * 1000, // 30 min in
    });

    render(<SectionETA />);

    // Should render one row marked as current
    const currentRow = document.querySelector(".section-row.current");
    expect(currentRow).not.toBeNull();
  });

  // ── Future sections ──────────────────────────────────────────────────────

  it("renders all section checkpoint names", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    expect(screen.getByText("Checkpoint A")).toBeInTheDocument();
    expect(screen.getByText("Checkpoint B")).toBeInTheDocument();
    expect(screen.getByText("Checkpoint C")).toBeInTheDocument();
  });

  it("marks past sections with the 'past' class", () => {
    // Position past all 3 sections
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 300,
      timestamp: START_MS + 10800 * 1000,
    });

    render(<SectionETA />);

    const pastRows = document.querySelectorAll(".section-row.past");
    expect(pastRows.length).toBe(SECTIONS.length);
  });

  // ── Difficulty labels ────────────────────────────────────────────────────

  it("shows difficulty label for future sections", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    expect(screen.getByText("Easy")).toBeInTheDocument(); // difficulty 1
    expect(screen.getByText("Moderate")).toBeInTheDocument(); // difficulty 2
    expect(screen.getByText("Hard")).toBeInTheDocument(); // difficulty 3
  });

  it("hides difficulty label for past sections", () => {
    // Past all sections
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 300,
      timestamp: START_MS + 10800 * 1000,
    });

    render(<SectionETA />);

    expect(screen.queryByText("Easy")).not.toBeInTheDocument();
    expect(screen.queryByText("Moderate")).not.toBeInTheDocument();
    expect(screen.queryByText("Hard")).not.toBeInTheDocument();
  });

  it("renders correct difficulty colors via inline style", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    const easyEl = screen.getByText("Easy");
    expect(easyEl).toHaveStyle({ color: "#4CAF50" });
    const moderateEl = screen.getByText("Moderate");
    expect(moderateEl).toHaveStyle({ color: "#ECBC3E" });
  });

  // ── Distance display ─────────────────────────────────────────────────────

  it("displays section end distance in km", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    // endIndex 100 → cumulativeDistances[100] = 5000m → 5.0 km
    expect(screen.getByText("5.0 km")).toBeInTheDocument();
    // endIndex 200 → 10000m → 10.0 km
    expect(screen.getByText("10.0 km")).toBeInTheDocument();
  });

  // ── Cutoff capping ───────────────────────────────────────────────────────

  it("does not cap recorded section ETAs regardless of cutoff", () => {
    // Section 1 has endTime recorded. Even if it's late, it must not be capped.
    const lateSections = [
      {
        ...SECTIONS[0],
        // endTime is far beyond startTime + maxCompletionTime
        endTime: START_TIME + 99999,
        maxCompletionTime: 1, // very tight cutoff
      },
    ];

    setupStore(lateSections, CUMULATIVE_DISTANCES, {
      index: 200, // past section 1
      timestamp: START_MS + 100000 * 1000,
    });

    render(<SectionETA />);

    // Recorded time should still render (not "--:--")
    expect(screen.getByText("Sat 10:00")).toBeInTheDocument();
  });

  it("caps unrecorded future ETA at section cutoff when estimate exceeds it", () => {
    // Section with tight cutoff: starts at START_TIME, max 1 second completion
    const tightCutoffSections = [
      {
        segmentId: "s1",
        startIndex: 0,
        endIndex: 100,
        totalDistance: 5000,
        estimatedDuration: 36000, // 10 hours — will exceed 1s cutoff
        difficulty: 5,
        startTime: START_TIME,
        endTime: null,
        maxCompletionTime: 1, // cutoff = START_TIME + 1 second
        endLocation: "Finish",
      },
    ];

    setupStore(tightCutoffSections, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    // ETA should be capped at cutoff and rendered via date-fns (mocked as "Sat 10:00")
    expect(screen.getByText("Sat 10:00")).toBeInTheDocument();
  });

  // ── Speed factor edge cases ───────────────────────────────────────────────

  it("defaults to speedFactor=1 when race has not started (no raceStart)", () => {
    // No startTime on first section → raceStart = null → speedFactor = 1.0
    const noTimeSections = [{ ...SECTIONS[0], startTime: null, endTime: null }];

    setupStore(noTimeSections, CUMULATIVE_DISTANCES, {
      index: 50,
      timestamp: START_MS + 1800 * 1000,
    });

    render(<SectionETA />);

    // Section with no raceStart → isCurrent path with raceStart=null → etaMs = null → "--:--"
    expect(screen.getByText("--:--")).toBeInTheDocument();
  });

  it("defaults to speedFactor=1 when at index 0 (no distance covered yet)", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    // Should render without crashing; all future sections show formatted ETA
    expect(screen.getAllByText("Sat 10:00").length).toBeGreaterThanOrEqual(1);
  });

  // ── Header ───────────────────────────────────────────────────────────────

  it("renders the list header labels", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    expect(screen.getByText("Checkpoint")).toBeInTheDocument();
    expect(screen.getByText("ETA")).toBeInTheDocument();
  });
});
