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

vi.mock("styled-components", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useTheme: () => ({
      currentVariant: "dark",
      colors: { dark: { "--color-text": "#D8DBE2" } },
    }),
  };
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const START_TIME = 1_000_000; // epoch seconds
const START_MS = START_TIME * 1000;

// Three consecutive sections, each 5 km and 1 h Naismith baseline
const SECTIONS = [
  {
    sectionId: "s1",
    startIndex: 0,
    endIndex: 100,
    totalDistance: 5000,
    estimatedDuration: 3600, // 1 h
    difficulty: 1,
    startTime: START_TIME,
    endTime: START_TIME + 3600,
    maxCompletionTime: 3600,
    startLocation: "Départ",
    endLocation: "Checkpoint A",
  },
  {
    sectionId: "s2",
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
    sectionId: "s3",
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

function setupStore(
  sections,
  cumulativeDistances,
  projectedLocation,
  forecasts = {},
) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      sections,
      gpx: { cumulativeDistances, data: [] },
      weather: { forecasts },
      fetchWeatherForCheckpoints: () => {},
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

  it("shows the planned schedule, marked as planned, before race start", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS - 1000, // one second before start
    });

    render(<SectionETA />);

    // Pre-race the hook computes raceStart + estimated durations; every row
    // (start + checkpoints) shows it via the date-fns mock, dimmed as planned.
    // (Count via .cp-eta — cutoff chips format to the same mocked string.)
    const etas = [...document.querySelectorAll(".cp-eta")];
    expect(etas).toHaveLength(SECTIONS.length + 1);
    expect(etas.every((el) => el.textContent === "Sat 10:00")).toBe(true);
    expect(screen.queryByText("--:--")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".cp-eta.planned")).toHaveLength(
      SECTIONS.length + 1,
    );
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

    // Should render one row marked as current, exposed via aria-current
    const currentRow = document.querySelector(".cp-row.current");
    expect(currentRow).not.toBeNull();
    expect(currentRow).toHaveAttribute("aria-current", "step");
  });

  it("keeps leg stats in the accessibility tree, hiding only the rail", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    const legRow = document.querySelector(".bc-row");
    expect(legRow).not.toHaveAttribute("aria-hidden");
    expect(legRow).toHaveAttribute("role", "listitem");
    expect(legRow.querySelector(".bc-rail")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("shows a live countdown only on the next arrival's row", () => {
    // Halfway through section 1 (0–100) at 30 min in, pace ratio 1 →
    // etaMs = now + 30 min → "in 30m" on Checkpoint A's row only.
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 50,
      timestamp: START_MS + 1800 * 1000,
    });

    render(<SectionETA />);

    expect(screen.getByText("in 30m")).toBeInTheDocument();
    expect(document.querySelectorAll(".cp-countdown")).toHaveLength(1);
  });

  // ── Cutoff display ───────────────────────────────────────────────────────

  it("renders cutoff times for checkpoints that have one", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    // s1 and s2 carry maxCompletionTime; s3 has none
    expect(document.querySelectorAll(".cp-cutoff")).toHaveLength(2);
    expect(document.querySelectorAll(".cp-cutoff.breached")).toHaveLength(0);
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

    const pastRows = document.querySelectorAll(".cp-row.past");
    // +1 for the start row which is also past
    expect(pastRows.length).toBe(SECTIONS.length + 1);
  });

  // ── Difficulty labels ────────────────────────────────────────────────────

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

  // ── Weather flags ────────────────────────────────────────────────────────

  it("flags harsh weather with an alert and highlights the offending stats", () => {
    setupStore(
      SECTIONS,
      CUMULATIVE_DISTANCES,
      { index: 0, timestamp: START_MS },
      {
        "Checkpoint A": {
          icon: "CloudSnow",
          temp: -3,
          precipitation: 80,
          wind: 45,
        },
        "Checkpoint B": { icon: "Sun", temp: 12, precipitation: 5, wind: 8 },
      },
    );

    render(<SectionETA />);

    expect(document.querySelectorAll(".cp-weather-line")).toHaveLength(2);
    const flagged = document.querySelectorAll(".cp-weather-line.flagged");
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toHaveAttribute(
      "aria-label",
      "Weather warning: freezing, high precipitation, strong wind",
    );
    expect(flagged[0].querySelector(".cp-weather-alert")).not.toBeNull();
    // cold → temp, wet → precip, windy → wind: all three highlighted here
    expect(flagged[0].querySelectorAll(".flagged-stat")).toHaveLength(3);
  });

  it("highlights only the condition that tripped the flag", () => {
    setupStore(
      SECTIONS,
      CUMULATIVE_DISTANCES,
      { index: 0, timestamp: START_MS },
      {
        // windy only: mild temp, dry
        "Checkpoint A": { icon: "Wind", temp: 8, precipitation: 0, wind: 60 },
      },
    );

    render(<SectionETA />);

    const flagged = document.querySelector(".cp-weather-line.flagged");
    expect(flagged).toHaveAttribute(
      "aria-label",
      "Weather warning: strong wind",
    );
    const stats = flagged.querySelectorAll(".flagged-stat");
    expect(stats).toHaveLength(1);
    expect(stats[0].textContent).toContain("60 km/h");
  });

  // ── Distance display ─────────────────────────────────────────────────────

  it("displays section end distance in km", () => {
    setupStore(SECTIONS, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    // [0] is the start row (0.0 km); checkpoints begin at [1]
    const kmCells = document.querySelectorAll(".cp-km");
    expect(kmCells[0].textContent).toBe("0.0 km");
    // endIndex 100 → cumulativeDistances[100] = 5000m → 5.0 km
    expect(kmCells[1].textContent).toBe("5.0 km");
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
    expect(screen.getAllByText("Sat 10:00").length).toBeGreaterThanOrEqual(1);
  });

  it("caps unrecorded future ETA at section cutoff when estimate exceeds it", () => {
    // Section with tight cutoff: starts at START_TIME, max 1 second completion
    const tightCutoffSections = [
      {
        sectionId: "s1",
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
    expect(screen.getAllByText("Sat 10:00").length).toBeGreaterThanOrEqual(1);
  });

  it("adds 'over-cutoff' class only to the first section that exceeds its cutoff", () => {
    const tightCutoffSections = [
      {
        sectionId: "s1",
        startIndex: 0,
        endIndex: 100,
        totalDistance: 5000,
        estimatedDuration: 36000, // 10 hours — will exceed 1s cutoff
        difficulty: 5,
        startTime: START_TIME,
        endTime: null,
        maxCompletionTime: 1,
        endLocation: "Checkpoint A",
      },
      {
        sectionId: "s2",
        startIndex: 100,
        endIndex: 200,
        totalDistance: 5000,
        estimatedDuration: 36000,
        difficulty: 5,
        startTime: START_TIME + 1,
        endTime: null,
        maxCompletionTime: 1,
        endLocation: "Checkpoint B",
      },
    ];

    setupStore(tightCutoffSections, CUMULATIVE_DISTANCES, {
      index: 0,
      timestamp: START_MS,
    });

    render(<SectionETA />);

    const overCutoffRows = document.querySelectorAll(".cp-row.over-cutoff");
    expect(overCutoffRows.length).toBe(1);
    // the breached row's cutoff chip switches to the warning presentation
    expect(document.querySelectorAll(".cp-cutoff.breached")).toHaveLength(1);
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
    expect(screen.getAllByText("--:--").length).toBeGreaterThanOrEqual(1);
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

    expect(screen.getByText("Checkpoints")).toBeInTheDocument();
  });
});
