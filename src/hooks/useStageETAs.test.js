import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storeModule from "../store/store.js";
import { useStageETAs } from "./useStageETAs.js";

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

const STAGE_1 = {
  stageId: "st1",
  startIndex: 0,
  endIndex: 100,
  startLocation: "Start",
  endLocation: "LifeBase1",
  startTime: START_TIME,
  endTime: null,
  maxCompletionTime: null,
  estimatedDuration: 3600, // 1 h Minetti
  totalDistance: 5000,
  difficulty: 1,
};

const STAGE_2 = {
  stageId: "st2",
  startIndex: 100,
  endIndex: 200,
  startLocation: "LifeBase1",
  endLocation: "Arrival",
  startTime: START_TIME + 3600,
  endTime: null,
  maxCompletionTime: null,
  estimatedDuration: 3600,
  totalDistance: 5000,
  difficulty: 2,
};

function setup(stages, projectedLocation, coords = COORDINATES) {
  storeModule.default.mockImplementation((selector) =>
    selector({
      stages,
      gpx: { cumulativeDistances: CUMULATIVE_DISTANCES, data: coords },
    }),
  );
  storeModule.useProjectedLocation.mockReturnValue(projectedLocation);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useStageETAs", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Empty / missing data ─────────────────────────────────────────────────

  it("returns empty array and null raceStart when no stages", () => {
    setup([], null);
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.stageETAs).toEqual([]);
    expect(result.current.raceStart).toBeNull();
  });

  it("returns empty array when cumulativeDistances is missing", () => {
    storeModule.default.mockImplementation((selector) =>
      selector({
        stages: [STAGE_1],
        gpx: { cumulativeDistances: [], data: COORDINATES },
      }),
    );
    storeModule.useProjectedLocation.mockReturnValue(null);
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.stageETAs).toEqual([]);
  });

  // ── raceStart ────────────────────────────────────────────────────────────

  it("derives raceStart in ms from stages[0].startTime", () => {
    setup([STAGE_1, STAGE_2], null);
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.raceStart).toBe(START_MS);
  });

  it("returns null raceStart when stages have no startTime", () => {
    setup([{ ...STAGE_1, startTime: null }, STAGE_2], null);
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.raceStart).toBeNull();
  });

  // ── isPreRace / hasGPSLock ────────────────────────────────────────────────

  it("isPreRace = true when timestamp is before raceStart", () => {
    setup([STAGE_1, STAGE_2], { index: 0, timestamp: START_MS - 1000 });
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.isPreRace).toBe(true);
  });

  it("isPreRace = false once race has started", () => {
    setup([STAGE_1, STAGE_2], { index: 0, timestamp: START_MS + 1000 });
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.isPreRace).toBe(false);
  });

  it("hasGPSLock is false without a projected location", () => {
    setup([STAGE_1, STAGE_2], null);
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.hasGPSLock).toBe(false);
  });

  it("hasGPSLock is true once a projected location with a timestamp exists", () => {
    setup([STAGE_1, STAGE_2], { index: 0, timestamp: START_MS + 1000 });
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.hasGPSLock).toBe(true);
  });

  // ── Pre-race ETAs (pure Minetti, paceRatio = 1) ──────────────────────────

  it("returns Minetti ETAs from raceStart before race begins", () => {
    setup([STAGE_1, STAGE_2], { index: 0, timestamp: START_MS - 5000 });
    const { result } = renderHook(() => useStageETAs());
    const [stage1, stage2] = result.current.stageETAs;
    expect(stage1.etaMs).toBe(START_MS + 3_600_000);
    expect(stage2.etaMs).toBe(START_MS + 7_200_000);
  });

  // ── isPast / isCurrent / future ───────────────────────────────────────────

  it("marks stages correctly as past, current, future", () => {
    // index 150 is inside stage 2 (100–200)
    setup([STAGE_1, STAGE_2], { index: 150, timestamp: START_MS + 5_000_000 });
    const { result } = renderHook(() => useStageETAs());
    const [stage1, stage2] = result.current.stageETAs;
    expect(stage1.isPast).toBe(true);
    expect(stage1.isCurrent).toBe(false);
    expect(stage2.isPast).toBe(false);
    expect(stage2.isCurrent).toBe(true);
  });

  it("does not mark any stage as past/current without a GPS lock", () => {
    setup([STAGE_1, STAGE_2], null);
    const { result } = renderHook(() => useStageETAs());
    const [stage1, stage2] = result.current.stageETAs;
    expect(stage1.isPast).toBe(false);
    expect(stage1.isCurrent).toBe(false);
    expect(stage2.isPast).toBe(false);
    expect(stage2.isCurrent).toBe(false);
  });

  // ── Cutoff breach ─────────────────────────────────────────────────────────

  it("caps ETA at maxCompletionTime cutoff and flags isOverCutoff", () => {
    const stages = [
      { ...STAGE_1, maxCompletionTime: 3000 }, // cutoff = START_TIME + 3000
      STAGE_2,
    ];
    setup(stages, { index: 0, timestamp: START_MS + 100_000 });
    const { result } = renderHook(() => useStageETAs());
    const [stage1] = result.current.stageETAs;
    // estimatedDuration (3600) > maxCompletionTime (3000) → capped and breached
    expect(stage1.isOverCutoff).toBe(true);
    expect(stage1.etaMs).toBe((START_TIME + 3000) * 1000);
  });

  it("does not cap past stages at cutoff even when the Minetti estimate exceeds it", () => {
    const stages = [{ ...STAGE_1, maxCompletionTime: 3000 }, STAGE_2];
    setup(stages, { index: 150, timestamp: START_MS + 5_000_000 });
    const { result } = renderHook(() => useStageETAs());
    const [stage1] = result.current.stageETAs;
    expect(stage1.isPast).toBe(true);
    expect(stage1.isOverCutoff).toBe(false);
  });

  // ── endKm / lat / lon ─────────────────────────────────────────────────────

  it("computes endKm from cumulativeDistances at endIndex", () => {
    setup([STAGE_1, STAGE_2], { index: 0, timestamp: START_MS });
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.stageETAs[0].endKm).toBe(5);
    expect(result.current.stageETAs[1].endKm).toBe(10);
  });

  it("exposes lat/lon from coordinates at endIndex", () => {
    setup([STAGE_1, STAGE_2], { index: 0, timestamp: START_MS });
    const { result } = renderHook(() => useStageETAs());
    const stage = result.current.stageETAs[0];
    expect(stage.lat).toBe(COORDINATES[100][0]);
    expect(stage.lon).toBe(COORDINATES[100][1]);
  });

  it("returns null lat/lon when endIndex is out of coordinates bounds", () => {
    setup([STAGE_1, STAGE_2], { index: 0, timestamp: START_MS }, []);
    const { result } = renderHook(() => useStageETAs());
    expect(result.current.stageETAs[0].lat).toBeNull();
    expect(result.current.stageETAs[0].lon).toBeNull();
  });
});
