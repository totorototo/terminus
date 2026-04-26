import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../store/store.js";
import { useCheckpointETAs } from "./useCheckpointETAs.js";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const START_TIME = 1_000_000; // unix seconds
const START_MS = START_TIME * 1000;

// 201 points, 50 m apart → index 100 = 5 000 m, index 200 = 10 000 m
const CUMULATIVE_DISTANCES = Array.from({ length: 201 }, (_, i) => i * 50);

// [lat, lon, ele] — coords at endIndex are what the hook exposes
const COORDINATES = Array.from({ length: 201 }, (_, i) => [
  45 + i * 0.001,
  2 + i * 0.001,
  1000 + i,
]);

const SECTION_1 = {
  sectionId: "s1",
  startIndex: 0,
  endIndex: 100,
  startLocation: "Start",
  endLocation: "CP1",
  startTime: START_TIME,
  endTime: null,
  maxCompletionTime: null,
  estimatedDuration: 3600, // 1 h Minetti
  totalDistance: 5000,
  difficulty: 1,
};

const SECTION_2 = {
  sectionId: "s2",
  startIndex: 100,
  endIndex: 200,
  startLocation: "CP1",
  endLocation: "CP2",
  startTime: START_TIME + 3600,
  endTime: null,
  maxCompletionTime: null,
  estimatedDuration: 3600,
  totalDistance: 5000,
  difficulty: 2,
};

function setup(sections, projectedLocation, coords = COORDINATES) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      sections,
      gpx: { cumulativeDistances: CUMULATIVE_DISTANCES, data: coords },
    }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useCheckpointETAs", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Empty / missing data ─────────────────────────────────────────────────

  it("returns empty array and null raceStart when no sections", () => {
    setup([], null);
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.checkpointETAs).toEqual([]);
    expect(result.current.raceStart).toBeNull();
  });

  it("returns empty array when cumulativeDistances is missing", () => {
    storeModule.default.mockImplementation((selector) =>
      selector({
        sections: [SECTION_1],
        gpx: { cumulativeDistances: [], data: COORDINATES },
      }),
    );
    storeModule.useProjectedLocation.mockReturnValue(null);
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.checkpointETAs).toEqual([]);
  });

  // ── raceStart ────────────────────────────────────────────────────────────

  it("derives raceStart in ms from sections[0].startTime", () => {
    setup([SECTION_1, SECTION_2], null);
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.raceStart).toBe(START_MS);
  });

  it("returns null raceStart when sections have no startTime", () => {
    setup([{ ...SECTION_1, startTime: null }, SECTION_2], null);
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.raceStart).toBeNull();
  });

  // ── isPreRace ────────────────────────────────────────────────────────────

  it("isPreRace = true when timestamp is before raceStart", () => {
    setup([SECTION_1, SECTION_2], {
      index: 0,
      timestamp: START_MS - 1000,
    });
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.isPreRace).toBe(true);
  });

  it("isPreRace = false once race has started", () => {
    setup([SECTION_1, SECTION_2], {
      index: 0,
      timestamp: START_MS + 1000,
    });
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.isPreRace).toBe(false);
  });

  it("isPreRace = false when raceStart is null", () => {
    setup([{ ...SECTION_1, startTime: null }, SECTION_2], null);
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.isPreRace).toBe(false);
  });

  // ── Pre-race ETAs (pure Minetti, paceRatio = 1) ──────────────────────────

  it("returns Minetti ETAs from raceStart before race begins", () => {
    setup([SECTION_1, SECTION_2], {
      index: 0,
      timestamp: START_MS - 5000,
    });
    const { result } = renderHook(() => useCheckpointETAs());
    const [s1, s2] = result.current.checkpointETAs;
    expect(s1.etaMs).toBe(START_MS + 3_600_000);
    expect(s2.etaMs).toBe(START_MS + 7_200_000);
  });

  // ── isPast / isCurrent / future ───────────────────────────────────────────

  it("marks sections correctly as past, current, future", () => {
    // index 150 is inside section 2 (100–200)
    setup([SECTION_1, SECTION_2], {
      index: 150,
      timestamp: START_MS + 5_000_000,
    });
    const { result } = renderHook(() => useCheckpointETAs());
    const [s1, s2] = result.current.checkpointETAs;
    expect(s1.isPast).toBe(true);
    expect(s1.isCurrent).toBe(false);
    expect(s2.isPast).toBe(false);
    expect(s2.isCurrent).toBe(true);
  });

  // ── Past section ETA uses Minetti * paceRatio ────────────────────────────

  it("past sections use Minetti estimate scaled by paceRatio, not endTime", () => {
    // endTime is the planned/scheduled time — it should not be used as the ETA
    const sections = [{ ...SECTION_1, endTime: START_TIME + 3500 }, SECTION_2];
    setup(sections, { index: 150, timestamp: START_MS + 5_000_000 });
    const { result } = renderHook(() => useCheckpointETAs());
    // paceRatio = 5000 / (3600 + 1800) = 5000/5400; etaMs = raceStart + 3600s * paceRatio
    const expected = START_MS + (3600 * 1000 * 5_000_000) / 5_400_000;
    expect(result.current.checkpointETAs[0].etaMs).toBeCloseTo(expected, 0);
  });

  // ── paceRatio = 1 when no distance covered ───────────────────────────────

  it("defaults to paceRatio=1 at index 0 — ETA equals raceStart + Minetti", () => {
    setup([SECTION_1, SECTION_2], {
      index: 0,
      timestamp: START_MS,
    });
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.checkpointETAs[0].etaMs).toBe(START_MS + 3_600_000);
  });

  // ── Cutoff cap ───────────────────────────────────────────────────────────

  it("caps ETA at maxCompletionTime cutoff", () => {
    const sections = [
      { ...SECTION_1, maxCompletionTime: 3000 }, // cutoff = START_TIME + 3000
      SECTION_2,
    ];
    setup(sections, { index: 0, timestamp: START_MS + 100_000 });
    const { result } = renderHook(() => useCheckpointETAs());
    // estimatedDuration (3600) > maxCompletionTime (3000) → capped
    expect(result.current.checkpointETAs[0].etaMs).toBe(
      (START_TIME + 3000) * 1000,
    );
  });

  it("does not cap past sections at cutoff even when Minetti estimate exceeds it", () => {
    // cutoff = START_TIME + 3000; Minetti estimate ≈ START_TIME + 3333s — above cutoff
    // but since the section is past, the cap must not apply
    const sections = [{ ...SECTION_1, maxCompletionTime: 3000 }, SECTION_2];
    setup(sections, { index: 150, timestamp: START_MS + 5_000_000 });
    const { result } = renderHook(() => useCheckpointETAs());
    const expected = START_MS + (3600 * 1000 * 5_000_000) / 5_400_000;
    expect(result.current.checkpointETAs[0].etaMs).toBeCloseTo(expected, 0);
  });

  // ── endKm ────────────────────────────────────────────────────────────────

  it("computes endKm from cumulativeDistances at endIndex", () => {
    setup([SECTION_1, SECTION_2], { index: 0, timestamp: START_MS });
    const { result } = renderHook(() => useCheckpointETAs());
    // endIndex=100, distance[100]=5000m → 5 km
    expect(result.current.checkpointETAs[0].endKm).toBe(5);
    // endIndex=200, distance[200]=10000m → 10 km
    expect(result.current.checkpointETAs[1].endKm).toBe(10);
  });

  // ── lat / lon ─────────────────────────────────────────────────────────────

  it("exposes lat/lon from coordinates at endIndex", () => {
    setup([SECTION_1, SECTION_2], { index: 0, timestamp: START_MS });
    const { result } = renderHook(() => useCheckpointETAs());
    const cp = result.current.checkpointETAs[0];
    expect(cp.lat).toBe(COORDINATES[100][0]);
    expect(cp.lon).toBe(COORDINATES[100][1]);
  });

  it("returns null lat/lon when endIndex is out of coordinates bounds", () => {
    setup([SECTION_1, SECTION_2], { index: 0, timestamp: START_MS }, []);
    const { result } = renderHook(() => useCheckpointETAs());
    expect(result.current.checkpointETAs[0].lat).toBeNull();
    expect(result.current.checkpointETAs[0].lon).toBeNull();
  });
});
