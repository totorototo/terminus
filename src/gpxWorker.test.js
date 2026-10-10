import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above all imports by Vitest
vi.mock("../zig/terminus.zig", () => ({
  __zigar: { init: vi.fn().mockResolvedValue(undefined) },
  readGPXComplete: vi.fn(),
  recalibrate: vi.fn(),
  Route: { init: vi.fn() },
  Trace: { init: vi.fn() },
}));

import {
  readGPXComplete,
  recalibrate,
  Route,
  Trace,
} from "../zig/terminus.zig";
// Import worker — executes self.onmessage = async function(e){...}
import { __resetWorkerCachesForTests } from "./gpxWorker.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function zigStr(value) {
  return { string: value };
}

/**
 * Shared default fields for a gpxz Trace proxy mock. Real Zigar Trace exposes
 * points_flat as the same backing memory as points, reinterpreted as a flat
 * [lat, lon, ele, ...] slice (see gpxz's trace.zig); a plain array here exercises
 * gpxWorker.js's `flat.typedArray ?? flat` fallback path.
 */
function baseTraceFields(overrides = {}) {
  return {
    distance_m: 5000,
    elevation_gain_m: 200,
    elevation_loss_m: 50,
    distances_m_cumulative: [0, 1000, 2000, 3000, 4000, 5000],
    elevation_gains_m_cumulative: [0, 20, 60, 100, 150, 200],
    elevation_losses_m_cumulative: [0, 0, 10, 20, 35, 50],
    slopes_percent: [0, 0, 0, 0, 0, 0],
    pace_factors: [1, 1, 1, 1, 1, 1],
    points: [
      [0.0, 0.0, 100],
      [0.001, 0.0, 120],
      [0.002, 0.0, 160],
      [0.003, 0.0, 200],
      [0.004, 0.0, 250],
      [0.005, 0.0, 300],
    ],
    points_flat: [
      0.0, 0.0, 100, 0.001, 0.0, 120, 0.002, 0.0, 160, 0.003, 0.0, 200, 0.004,
      0.0, 250, 0.005, 0.0, 300,
    ],
    peaks: [],
    valleys: [],
    climbs: [],
    ...overrides,
  };
}

function makeTrace(overrides = {}) {
  return {
    ...baseTraceFields(),
    deinit: vi.fn(),
    ...overrides,
  };
}

function makeLeg(startLocation = "Start", endLocation = "End", overrides = {}) {
  return {
    valueOf: () => ({
      leg_index: 0,
      section_index: 0,
      index_start: 0,
      index_end: 5,
      point_count: 6,
      distance_m: 1000,
      elevation_gain_m: 50,
      elevation_loss_m: 10,
      slope_percent_average: 5,
      slope_percent_max: 15,
      elevation_m_min: 100,
      elevation_m_max: 150,
      bearing_degrees: 45,
      difficulty: 2,
      duration_s_estimated: 1200,
      ...overrides,
    }),
    location_start: zigStr(startLocation),
    location_end: zigStr(endLocation),
  };
}

function makeSection(
  startLocation = "CP1",
  endLocation = "CP2",
  overrides = {},
) {
  return {
    valueOf: () => ({
      section_index: 0,
      stage_index: 0,
      index_start: 0,
      index_end: 5,
      point_count: 6,
      distance_m: 1000,
      elevation_gain_m: 50,
      elevation_loss_m: 10,
      slope_percent_average: 5,
      slope_percent_max: 15,
      elevation_m_min: 100,
      elevation_m_max: 150,
      bearing_degrees: 90,
      difficulty: 2,
      duration_s_estimated: 1200,
      duration_s_cutoff: BigInt(7200),
      epoch_s_start: BigInt(1_000_000),
      epoch_s_end: BigInt(1_007_200),
      ...overrides,
    }),
    location_start: zigStr(startLocation),
    location_end: zigStr(endLocation),
  };
}

function makeStage(
  startLocation = "Start",
  endLocation = "Finish",
  overrides = {},
) {
  return {
    valueOf: () => ({
      stage_index: 0,
      index_start: 0,
      index_end: 5,
      point_count: 6,
      distance_m: 5000,
      elevation_gain_m: 200,
      elevation_loss_m: 50,
      slope_percent_average: 4,
      slope_percent_max: 20,
      elevation_m_min: 100,
      elevation_m_max: 300,
      bearing_degrees: 45,
      difficulty: 3,
      duration_s_estimated: 7200,
      duration_s_cutoff: BigInt(14400),
      epoch_s_start: BigInt(1_000_000),
      epoch_s_end: BigInt(1_014_400),
      ...overrides,
    }),
    location_start: zigStr(startLocation),
    location_end: zigStr(endLocation),
  };
}

function makeClimb(overrides = {}) {
  return {
    valueOf: () => ({
      index_start: BigInt(2),
      index_end: BigInt(5),
      distance_m_start: 2000,
      distance_m: 3000,
      elevation_gain_m: 150,
      elevation_m_summit: 300,
      gradient_percent_average: 5,
      ...overrides,
    }),
  };
}

function makeGpxData(overrides = {}) {
  return {
    metadata: {
      name: zigStr("Test Trail"),
      description: zigStr("A test description"),
    },
    trace: {
      ...baseTraceFields(),
    },
    waypoints: [],
    legs: null,
    sections: null,
    stages: null,
    // Flat [lat, lon, ele, ...] (stride 3), as the Zig side now returns.
    // Real Zigar slices expose `.typedArray`; a plain array exercises the
    // fallback path in the worker.
    points_full_resolution: [
      0.0, 0.0, 100, 0.001, 0.002, 120, 0.003, 0.004, 160,
    ],
    deinit: vi.fn(),
    ...overrides,
  };
}

/** Resident parsed route; recalibrate() on it resolves the given RecalibrationPair. */
function makeRoute(pair) {
  recalibrate.mockResolvedValue(pair);
  return { deinit: vi.fn() };
}

async function dispatch(type, data = {}, id = "req-1") {
  await self.onmessage({ data: { type, data, id } });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("postMessage", vi.fn());
  Trace.init.mockReturnValue(makeTrace());
  // The worker caches a resident Trace and parsed Route across messages; drop
  // them so state mocked by a previous test can never satisfy this test.
  __resetWorkerCachesForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("message routing", () => {
  it("posts ERROR for unknown message type", async () => {
    await dispatch("UNKNOWN_TYPE");
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR", id: "req-1" }),
    );
  });

  it("routes PROCESS_GPX_FILE and posts GPX_FILE_PROCESSED", async () => {
    readGPXComplete.mockResolvedValue(makeGpxData());
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GPX_FILE_PROCESSED", id: "req-1" }),
      expect.arrayContaining([expect.any(ArrayBuffer)]),
    );
  });

  it("transfers full-resolution route coordinates as flat [lat, lon, ele]", async () => {
    readGPXComplete.mockResolvedValue(makeGpxData());
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });
    const [message, transfer] = postMessage.mock.calls[0];
    const { routeLatLonEle } = message.results;
    // Kept in Zig's native [lat, lon, ele] order; the map swaps to [lng, lat].
    expect(Array.from(routeLatLonEle)).toEqual([
      0.0, 0.0, 100, 0.001, 0.002, 120, 0.003, 0.004, 160,
    ]);
    expect(transfer).toEqual([routeLatLonEle.buffer]);
  });

  it("forwards a neutral weather lookup when no forecasts are given", async () => {
    readGPXComplete.mockResolvedValue(makeGpxData());
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });
    const weatherArg = readGPXComplete.mock.calls[0][4];
    expect(weatherArg).toEqual({ names: [], values: [] });
  });

  it("converts forecasts to a Zig weather lookup keyed by checkpoint name", async () => {
    readGPXComplete.mockResolvedValue(makeGpxData());
    await dispatch("PROCESS_GPX_FILE", {
      gpxBytes: new ArrayBuffer(0),
      weatherByCheckpoint: {
        Summit: { temp: 28, humidity: 80, wind: 35, precipitation: 60 },
      },
    });
    const weatherArg = readGPXComplete.mock.calls[0][4];
    expect(weatherArg.names).toEqual(["Summit"]);
    expect(weatherArg.values[0]).toEqual({
      temperature_c: 28,
      humidity_percent: 80,
      wind_kmh: 35,
      precipitation_probability_percent: 60,
    });
  });

  it("fills neutral defaults for forecast fields that are not finite", async () => {
    readGPXComplete.mockResolvedValue(makeGpxData());
    await dispatch("PROCESS_GPX_FILE", {
      gpxBytes: new ArrayBuffer(0),
      weatherByCheckpoint: {
        Col: {
          temp: null,
          humidity: undefined,
          wind: NaN,
          precipitation: null,
        },
      },
    });
    const weatherArg = readGPXComplete.mock.calls[0][4];
    expect(weatherArg.values[0]).toEqual({
      temperature_c: 12.0,
      humidity_percent: 50.0,
      wind_kmh: 0.0,
      precipitation_probability_percent: 0.0,
    });
  });

  it("routes FIND_CLOSEST_LOCATION and posts CLOSEST_POINT_FOUND", async () => {
    Trace.init.mockReturnValue({
      ...makeTrace(),
      closest_point: vi.fn().mockReturnValue({
        point: [1, 2, 3],
        index: 0,
        distance_m: 10,
      }),
    });
    await dispatch("FIND_CLOSEST_LOCATION", {
      coordinates: [[0, 0, 0]],
      target: [1, 2, 3],
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CLOSEST_POINT_FOUND" }),
    );
  });

  it("posts null closest location instead of crashing when the trace is empty", async () => {
    Trace.init.mockReturnValue({
      ...makeTrace(),
      closest_point: vi.fn().mockReturnValue(null),
    });
    await dispatch("FIND_CLOSEST_LOCATION", {
      coordinates: [[0, 0, 0]],
      target: [1, 2, 3],
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLOSEST_POINT_FOUND",
        closestLocation: null,
        closestIndex: null,
        deviationDistance: 0,
      }),
    );
  });

  it("routes RECALIBRATE and posts a sanitized RECALIBRATED payload", async () => {
    const deinit = vi.fn();
    const sectionRecal = {
      calibration_factor: 1.25,
      pace_base_s_per_km_calibrated: 625,
      duration_s_predicted: 800,
      duration_s_actual: 1000,
      etas: [
        {
          valueOf: () => ({
            index: 0n,
            index_end: 10n,
            duration_s_remaining: 1200,
            duration_s_remaining_cumulative: 1200,
          }),
        },
        {
          valueOf: () => ({
            index: 1n,
            index_end: 20n,
            duration_s_remaining: 1500,
            duration_s_remaining_cumulative: 2700,
          }),
        },
      ],
    };
    const stageRecal = {
      calibration_factor: 1.1,
      pace_base_s_per_km_calibrated: 550,
      duration_s_predicted: 900,
      duration_s_actual: 1000,
      etas: [
        {
          valueOf: () => ({
            index: 0n,
            index_end: 20n,
            duration_s_remaining: 2600,
            duration_s_remaining_cumulative: 2600,
          }),
        },
      ],
    };
    Route.init.mockResolvedValue(
      makeRoute({ section: sectionRecal, stage: stageRecal, deinit }),
    );

    await dispatch("RECALIBRATE", {
      gpxBytes: new ArrayBuffer(0),
      currentIndex: 5,
      actualElapsedS: 1000,
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RECALIBRATED",
        id: "req-1",
        results: {
          recalibration: {
            section: {
              kind: "section",
              calibrationFactor: 1.25,
              calibratedBasePaceSPerKm: 625,
              predictedSoFarS: 800,
              actualElapsedS: 1000,
              etas: [
                {
                  id: 0,
                  endIndex: 10,
                  remainingDurationS: 1200,
                  cumulativeRemainingS: 1200,
                },
                {
                  id: 1,
                  endIndex: 20,
                  remainingDurationS: 1500,
                  cumulativeRemainingS: 2700,
                },
              ],
            },
            stage: {
              kind: "stage",
              calibrationFactor: 1.1,
              calibratedBasePaceSPerKm: 550,
              predictedSoFarS: 900,
              actualElapsedS: 1000,
              etas: [
                {
                  id: 0,
                  endIndex: 20,
                  remainingDurationS: 2600,
                  cumulativeRemainingS: 2600,
                },
              ],
            },
          },
        },
      }),
    );
    expect(deinit).toHaveBeenCalledTimes(1);
  });

  it("computes both kinds from a single recalibrate call on the resident route", async () => {
    const route = makeRoute({ section: null, stage: null, deinit: vi.fn() });
    Route.init.mockResolvedValue(route);
    await dispatch("RECALIBRATE", {
      gpxBytes: new ArrayBuffer(0),
      currentIndex: 7,
      actualElapsedS: 1800,
    });
    expect(recalibrate).toHaveBeenCalledTimes(1);
    expect(recalibrate).toHaveBeenCalledWith(
      route,
      7,
      1800,
      500.0,
      0.002,
      3600,
      { names: [], values: [] },
    );
  });

  it("posts null kinds when the route lacks two boundaries", async () => {
    Route.init.mockResolvedValue(
      makeRoute({ section: null, stage: null, deinit: vi.fn() }),
    );
    await dispatch("RECALIBRATE", {
      gpxBytes: new ArrayBuffer(0),
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RECALIBRATED",
        results: { recalibration: { section: null, stage: null } },
      }),
    );
  });

  it("posts ERROR when recalibrating with no route loaded and no gpxBytes", async () => {
    await dispatch("RECALIBRATE", { currentIndex: 0, actualElapsedS: 0 });
    expect(Route.init).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR", id: "req-1" }),
    );
  });
});

describe("resident trace cache", () => {
  function makeClosestTrace(result) {
    return {
      ...makeTrace(),
      closest_point: vi.fn().mockReturnValue(result),
    };
  }

  it("reuses the cached Trace for repeated queries on the same coordinates", async () => {
    Trace.init.mockReturnValue(
      makeClosestTrace({ point: [1, 2, 3], index: 0, distance_m: 10 }),
    );
    const coordinates = [
      [0.0, 0.0, 100],
      [0.001, 0.0, 120],
    ];

    await dispatch("FIND_CLOSEST_LOCATION", { coordinates, target: [1, 2, 3] });
    // Same route content, different array instance (as after structured clone)
    await dispatch(
      "FIND_CLOSEST_LOCATION",
      { coordinates: coordinates.map((p) => [...p]), target: [4, 5, 6] },
      "req-2",
    );

    expect(Trace.init).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "CLOSEST_POINT_FOUND", id: "req-2" }),
    );
  });

  it("frees the previous Trace and rebuilds when coordinates change", async () => {
    const first = makeClosestTrace({
      point: [1, 2, 3],
      index: 0,
      distance_m: 1,
    });
    const second = makeClosestTrace({
      point: [4, 5, 6],
      index: 1,
      distance_m: 2,
    });
    Trace.init.mockReturnValueOnce(first).mockReturnValueOnce(second);

    await dispatch("FIND_CLOSEST_LOCATION", {
      coordinates: [[0.0, 0.0, 100]],
      target: [1, 2, 3],
    });
    await dispatch(
      "FIND_CLOSEST_LOCATION",
      { coordinates: [[9.0, 9.0, 900]], target: [1, 2, 3] },
      "req-2",
    );

    expect(Trace.init).toHaveBeenCalledTimes(2);
    expect(first.deinit).toHaveBeenCalledTimes(1);
    expect(second.deinit).not.toHaveBeenCalled();
  });

  it("shares the cached Trace across different query message types", async () => {
    const trace = {
      ...makeTrace(),
      closest_point: vi
        .fn()
        .mockReturnValue({ point: [1, 2, 3], index: 0, distance_m: 10 }),
      point_at_distance: vi.fn().mockReturnValue([0.001, 0.0, 120]),
    };
    Trace.init.mockReturnValue(trace);
    const coordinates = [
      [0.0, 0.0, 100],
      [0.001, 0.0, 120],
    ];

    await dispatch("FIND_CLOSEST_LOCATION", { coordinates, target: [1, 2, 3] });
    await dispatch(
      "FIND_POINTS_AT_DISTANCES",
      { coordinates, distances: [500] },
      "req-2",
    );

    expect(Trace.init).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "POINTS_FOUND", id: "req-2" }),
    );
  });
});

describe("resident route cache (recalibration)", () => {
  const nullPair = () => ({ section: null, stage: null, deinit: vi.fn() });

  it("parses the route once and reuses it across recalibration ticks", async () => {
    const route = makeRoute(nullPair());
    recalibrate.mockImplementation(() => Promise.resolve(nullPair()));
    Route.init.mockResolvedValue(route);

    await dispatch("RECALIBRATE", { gpxBytes: new ArrayBuffer(0) });
    await dispatch("RECALIBRATE", { gpxBytes: new ArrayBuffer(0) }, "req-2");

    expect(Route.init).toHaveBeenCalledTimes(1);
    expect(recalibrate).toHaveBeenCalledTimes(2);
  });

  it("recalibrates from bytes retained by PROCESS_GPX_FILE without gpxBytes in the payload", async () => {
    readGPXComplete.mockResolvedValue(makeGpxData());
    const gpxBytes = new ArrayBuffer(8);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes });

    const route = makeRoute(nullPair());
    Route.init.mockResolvedValue(route);
    await dispatch("RECALIBRATE", { currentIndex: 3 }, "req-2");

    expect(Route.init).toHaveBeenCalledWith(gpxBytes);
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "RECALIBRATED", id: "req-2" }),
    );
  });

  it("frees the parsed route when a new GPX file is processed", async () => {
    const route = makeRoute(nullPair());
    Route.init.mockResolvedValue(route);
    await dispatch("RECALIBRATE", { gpxBytes: new ArrayBuffer(0) });

    readGPXComplete.mockResolvedValue(makeGpxData());
    await dispatch(
      "PROCESS_GPX_FILE",
      { gpxBytes: new ArrayBuffer(8) },
      "req-2",
    );

    expect(route.deinit).toHaveBeenCalledTimes(1);
  });
});

describe("getRouteSection input validation", () => {
  const coords = [
    [0, 0, 0],
    [1, 1, 1],
    [2, 2, 2],
    [3, 3, 3],
  ];

  it("rejects non-integer start", async () => {
    await dispatch("GET_ROUTE_SECTION", {
      coordinates: coords,
      start: 0.5,
      end: 3,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });

  it("rejects non-integer end", async () => {
    await dispatch("GET_ROUTE_SECTION", {
      coordinates: coords,
      start: 0,
      end: 2.5,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });

  it("rejects negative start", async () => {
    await dispatch("GET_ROUTE_SECTION", {
      coordinates: coords,
      start: -1,
      end: 3,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });

  it("rejects end > coordinates.length", async () => {
    await dispatch("GET_ROUTE_SECTION", {
      coordinates: coords,
      start: 0,
      end: coords.length + 1,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });

  it("rejects start >= end", async () => {
    await dispatch("GET_ROUTE_SECTION", {
      coordinates: coords,
      start: 2,
      end: 2,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });

  it("accepts valid range and posts ROUTE_SECTION_READY", async () => {
    await dispatch("GET_ROUTE_SECTION", {
      coordinates: coords,
      start: 0,
      end: 3,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ROUTE_SECTION_READY", id: "req-1" }),
    );
  });
});

describe("processGPXFile sanitization", () => {
  it("converts Zig .string proxies to JS strings for waypoints", async () => {
    const gpxData = makeGpxData({
      waypoints: [
        {
          latitude: 48.85,
          longitude: 2.35,
          elevation_m: 100,
          name: zigStr("Col du Bonhomme"),
          description: zigStr("A mountain pass"),
          comment: null,
          symbol: zigStr("Flag"),
          type_name: zigStr("TimeBarrier"),
          epoch_s: null,
        },
      ],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const [call] = postMessage.mock.calls;
    const { results } = call[0];
    expect(results.waypoints[0].name).toBe("Col du Bonhomme");
    expect(results.waypoints[0].desc).toBe("A mountain pass");
    expect(results.waypoints[0].sym).toBe("Flag");
    expect(results.waypoints[0].wptType).toBe("TimeBarrier");
  });

  it("preserves null optional waypoint fields as null", async () => {
    const gpxData = makeGpxData({
      waypoints: [
        {
          latitude: 0,
          longitude: 0,
          elevation_m: null,
          name: zigStr("Plain"),
          description: null,
          comment: null,
          symbol: null,
          type_name: null,
          epoch_s: null,
        },
      ],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    const wpt = results.waypoints[0];
    expect(wpt.desc).toBeNull();
    expect(wpt.cmt).toBeNull();
    expect(wpt.sym).toBeNull();
    expect(wpt.wptType).toBeNull();
    expect(wpt.time).toBeNull();
    expect(wpt.ele).toBeNull();
  });

  it("converts BigInt i64 timestamps to Number for sections", async () => {
    const gpxData = makeGpxData({
      sections: [makeSection()],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    const section = results.sections[0];
    expect(typeof section.startTime).toBe("number");
    expect(typeof section.endTime).toBe("number");
    expect(typeof section.maxCompletionTime).toBe("number");
    expect(section.startTime).toBe(1_000_000);
    expect(section.endTime).toBe(1_007_200);
    expect(section.maxCompletionTime).toBe(7200);
  });

  it("preserves null timestamps as null (not converted)", async () => {
    const gpxData = makeGpxData({
      sections: [
        makeSection("A", "B", {
          epoch_s_start: null,
          epoch_s_end: null,
          duration_s_cutoff: null,
        }),
      ],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    const section = results.sections[0];
    expect(section.startTime).toBeNull();
    expect(section.endTime).toBeNull();
    expect(section.maxCompletionTime).toBeNull();
  });

  it("converts BigInt usize indices to Number for climbs", async () => {
    const gpxData = makeGpxData({
      trace: {
        ...baseTraceFields(),
        climbs: [makeClimb()],
      },
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    const climb = results.climbs[0];
    expect(typeof climb.startIndex).toBe("number");
    expect(typeof climb.endIndex).toBe("number");
    expect(climb.startIndex).toBe(2);
    expect(climb.endIndex).toBe(5);
  });

  it("builds leg segmentId from sectionIdx and location names", async () => {
    const gpxData = makeGpxData({
      legs: [makeLeg("Départ", "Checkpoint 1")],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.legs[0].segmentId).toBe("leg-0-Départ-Checkpoint 1");
  });

  it("builds section sectionId from stageIdx and location names", async () => {
    const gpxData = makeGpxData({
      sections: [makeSection("Start", "Barrier 1")],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.sections[0].sectionId).toBe("section-0-Start-Barrier 1");
  });

  it("builds stage stageId from location names", async () => {
    const gpxData = makeGpxData({
      stages: [makeStage("Start", "Finish")],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.stages[0].stageId).toBe("stage-Start-Finish");
  });

  it("maps gpxz's snake_case interval fields to the store's camelCase shape", async () => {
    const gpxData = makeGpxData({
      legs: [makeLeg("Start", "CP1")],
      sections: [
        makeSection("Start", "CP1", {
          pace_factor: 1.3,
          effort_factor: 1.5,
          cutoff_ratio: 0.8,
          stop_s: 600,
          point_start: [45, 7, 300],
          point_end: [45.01, 7.01, 600],
        }),
      ],
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.sections[0]).toEqual({
      sectionId: "section-0-Start-CP1",
      stageIdx: 0,
      startIndex: 0,
      endIndex: 5,
      pointCount: 6,
      startPoint: [45, 7, 300],
      endPoint: [45.01, 7.01, 600],
      startLocation: "Start",
      endLocation: "CP1",
      totalDistance: 1000,
      totalElevation: 50,
      totalElevationLoss: 10,
      avgSlope: 5,
      maxSlope: 15,
      minElevation: 100,
      maxElevation: 150,
      bearing: 90,
      difficulty: 2,
      estimatedDuration: 1200,
      startTime: 1_000_000,
      endTime: 1_007_200,
      paceFactor: 1.3,
      effortFactor: 1.5,
      maxCompletionTime: 7200,
      cutoffRatio: 0.8,
      stopDuration: 600,
    });
    expect(results.legs[0]).toMatchObject({
      legId: 0,
      sectionIdx: 0,
      totalDistance: 1000,
      bearing: 45,
      estimatedDuration: 1200,
    });
  });

  it("converts metadata Zig strings", async () => {
    const gpxData = makeGpxData({
      metadata: {
        name: zigStr("UTMB 2024"),
        description: zigStr("Ultra-Trail du Mont-Blanc"),
      },
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.metadata.name).toBe("UTMB 2024");
    expect(results.metadata.description).toBe("Ultra-Trail du Mont-Blanc");
  });

  it("handles null metadata fields", async () => {
    const gpxData = makeGpxData({
      metadata: { name: null, description: null },
    });
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.metadata.name).toBeNull();
    expect(results.metadata.description).toBeNull();
  });

  it("calls deinit after processing to free WASM memory", async () => {
    const gpxData = makeGpxData();
    readGPXComplete.mockResolvedValue(gpxData);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });
    expect(gpxData.deinit).toHaveBeenCalledOnce();
  });
});

describe("WASM cleanup on error paths", () => {
  it("frees gpxData when sanitization throws mid-processGPXFile", async () => {
    // A waypoint with a null name makes `wpt.name.string` throw during sanitization.
    const gpxData = makeGpxData({
      waypoints: [
        {
          latitude: 0,
          longitude: 0,
          elevation_m: null,
          name: null,
          epoch_s: null,
        },
      ],
    });
    readGPXComplete.mockResolvedValue(gpxData);

    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR", id: "req-1" }),
    );
    expect(gpxData.deinit).toHaveBeenCalledOnce();
  });

  it("frees the recalibration result when sanitization throws", async () => {
    const deinit = vi.fn();
    // `etas` missing → sanitizeKind throws reading `.length`.
    Route.init.mockResolvedValue(
      makeRoute({ section: {}, stage: null, deinit }),
    );

    await dispatch("RECALIBRATE", {
      gpxBytes: new ArrayBuffer(0),
      currentIndex: 0,
      actualElapsedS: 0,
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR", id: "req-1" }),
    );
    expect(deinit).toHaveBeenCalledOnce();
  });

  it("frees the ephemeral trace when getRouteSection fails after init", async () => {
    const trace = {
      deinit: vi.fn(),
      get distance_m() {
        throw new Error("boom");
      },
    };
    Trace.init.mockReturnValue(trace);

    await dispatch("GET_ROUTE_SECTION", {
      coordinates: [
        [0, 0, 0],
        [1, 1, 1],
      ],
      start: 0,
      end: 2,
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR", id: "req-1" }),
    );
    expect(trace.deinit).toHaveBeenCalledOnce();
  });
});
