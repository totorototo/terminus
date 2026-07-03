import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above all imports by Vitest
vi.mock("../zig/gpx.zig", () => ({
  readGPXComplete: vi.fn(),
  Route: { init: vi.fn() },
}));
vi.mock("../zig/trace.zig", () => ({
  __zigar: { init: vi.fn().mockResolvedValue(undefined) },
  Trace: { init: vi.fn() },
}));
vi.mock("../zig/soundscape.zig", () => ({ generateAudioFrames: vi.fn() }));

import { readGPXComplete, Route } from "../zig/gpx.zig";
import { generateAudioFrames } from "../zig/soundscape.zig";
import { Trace } from "../zig/trace.zig";
// Import worker — executes self.onmessage = async function(e){...}
import { __resetWorkerCachesForTests } from "./gpxWorker.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function zigStr(value) {
  return { string: value };
}

/**
 * Shared default fields for a Trace proxy mock. Real Zigar Trace exposes
 * pointsFlat as the same backing memory as points, reinterpreted as a flat
 * [lat, lon, ele, ...] slice (see trace.zig); a plain array here exercises
 * gpxWorker.js's `flat.typedArray ?? flat` fallback path.
 */
function baseTraceFields(overrides = {}) {
  return {
    totalDistance: 5000,
    totalElevation: 200,
    totalElevationLoss: 50,
    cumulativeDistances: [0, 1000, 2000, 3000, 4000, 5000],
    cumulativeElevations: [0, 20, 60, 100, 150, 200],
    cumulativeElevationLoss: [0, 0, 10, 20, 35, 50],
    slopes: [0, 0, 0, 0, 0, 0],
    points: [
      [0.0, 0.0, 100],
      [0.001, 0.0, 120],
      [0.002, 0.0, 160],
      [0.003, 0.0, 200],
      [0.004, 0.0, 250],
      [0.005, 0.0, 300],
    ],
    pointsFlat: [
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
      legId: 0,
      sectionIdx: 0,
      startIndex: 0,
      endIndex: 5,
      pointCount: 6,
      totalDistance: 1000,
      totalElevation: 50,
      totalElevationLoss: 10,
      avgSlope: 5,
      maxSlope: 15,
      minElevation: 100,
      maxElevation: 150,
      bearing: 45,
      difficulty: 2,
      estimatedDuration: 1200,
      ...overrides,
    }),
    startLocation: zigStr(startLocation),
    endLocation: zigStr(endLocation),
  };
}

function makeSection(
  startLocation = "CP1",
  endLocation = "CP2",
  overrides = {},
) {
  return {
    valueOf: () => ({
      sectionId: 0,
      stageIdx: 0,
      startIndex: 0,
      endIndex: 5,
      pointCount: 6,
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
      maxCompletionTime: BigInt(7200),
      startTime: BigInt(1_000_000),
      endTime: BigInt(1_007_200),
      ...overrides,
    }),
    startLocation: zigStr(startLocation),
    endLocation: zigStr(endLocation),
  };
}

function makeStage(
  startLocation = "Start",
  endLocation = "Finish",
  overrides = {},
) {
  return {
    valueOf: () => ({
      stageId: 0,
      startIndex: 0,
      endIndex: 5,
      pointCount: 6,
      totalDistance: 5000,
      totalElevation: 200,
      totalElevationLoss: 50,
      avgSlope: 4,
      maxSlope: 20,
      minElevation: 100,
      maxElevation: 300,
      bearing: 45,
      difficulty: 3,
      estimatedDuration: 7200,
      maxCompletionTime: BigInt(14400),
      startTime: BigInt(1_000_000),
      endTime: BigInt(1_014_400),
      ...overrides,
    }),
    startLocation: zigStr(startLocation),
    endLocation: zigStr(endLocation),
  };
}

function makeClimb(overrides = {}) {
  return {
    valueOf: () => ({
      startIndex: BigInt(2),
      endIndex: BigInt(5),
      startDistM: 2000,
      climbDistM: 3000,
      elevationGain: 150,
      summitElev: 300,
      avgGradient: 5,
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
    fullResPoints: [0.0, 0.0, 100, 0.001, 0.002, 120, 0.003, 0.004, 160],
    deinit: vi.fn(),
    ...overrides,
  };
}

/** Resident parsed route: recalibrateBoth resolves the given RecalibrationPair. */
function makeRoute(pair) {
  return {
    recalibrateBoth: vi.fn().mockResolvedValue(pair),
    deinit: vi.fn(),
  };
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
      humidity_pct: 80,
      wind_kmh: 35,
      precip_prob_pct: 60,
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
      humidity_pct: 50.0,
      wind_kmh: 0.0,
      precip_prob_pct: 0.0,
    });
  });

  it("routes FIND_CLOSEST_LOCATION and posts CLOSEST_POINT_FOUND", async () => {
    Trace.init.mockReturnValue({
      ...makeTrace(),
      findClosestPoint: vi.fn().mockReturnValue({
        point: [1, 2, 3],
        index: 0,
        distance: 10,
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
      findClosestPoint: vi.fn().mockReturnValue(null),
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

  it("routes GENERATE_AUDIO_FRAMES and posts AUDIO_FRAMES_READY", async () => {
    generateAudioFrames.mockResolvedValue(
      Object.assign([], { deinit: vi.fn() }),
    );
    await dispatch("GENERATE_AUDIO_FRAMES", {
      elevations: [100],
      distances: [0],
      slopes: [0],
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "AUDIO_FRAMES_READY" }),
    );
  });

  it("routes RECALIBRATE and posts a sanitized RECALIBRATED payload", async () => {
    const deinit = vi.fn();
    const sectionRecal = {
      calibrationFactor: 1.25,
      calibratedBasePaceSPerKm: 625,
      predictedSoFarS: 800,
      actualElapsedS: 1000,
      etas: [
        {
          valueOf: () => ({
            id: 0n,
            endIndex: 10n,
            remainingDurationS: 1200,
            cumulativeRemainingS: 1200,
          }),
        },
        {
          valueOf: () => ({
            id: 1n,
            endIndex: 20n,
            remainingDurationS: 1500,
            cumulativeRemainingS: 2700,
          }),
        },
      ],
    };
    const stageRecal = {
      calibrationFactor: 1.1,
      calibratedBasePaceSPerKm: 550,
      predictedSoFarS: 900,
      actualElapsedS: 1000,
      etas: [
        {
          valueOf: () => ({
            id: 0n,
            endIndex: 20n,
            remainingDurationS: 2600,
            cumulativeRemainingS: 2600,
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

  it("computes both kinds from a single recalibrateBoth call", async () => {
    const route = makeRoute({ section: null, stage: null, deinit: vi.fn() });
    Route.init.mockResolvedValue(route);
    await dispatch("RECALIBRATE", {
      gpxBytes: new ArrayBuffer(0),
      currentIndex: 0,
      actualElapsedS: 0,
    });
    expect(route.recalibrateBoth).toHaveBeenCalledTimes(1);
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
      findClosestPoint: vi.fn().mockReturnValue(result),
    };
  }

  it("reuses the cached Trace for repeated queries on the same coordinates", async () => {
    Trace.init.mockReturnValue(
      makeClosestTrace({ point: [1, 2, 3], index: 0, distance: 10 }),
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
    const first = makeClosestTrace({ point: [1, 2, 3], index: 0, distance: 1 });
    const second = makeClosestTrace({
      point: [4, 5, 6],
      index: 1,
      distance: 2,
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
      findClosestPoint: vi
        .fn()
        .mockReturnValue({ point: [1, 2, 3], index: 0, distance: 10 }),
      pointAtDistance: vi.fn().mockReturnValue([0.001, 0.0, 120]),
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
    route.recalibrateBoth.mockImplementation(() => Promise.resolve(nullPair()));
    Route.init.mockResolvedValue(route);

    await dispatch("RECALIBRATE", { gpxBytes: new ArrayBuffer(0) });
    await dispatch("RECALIBRATE", { gpxBytes: new ArrayBuffer(0) }, "req-2");

    expect(Route.init).toHaveBeenCalledTimes(1);
    expect(route.recalibrateBoth).toHaveBeenCalledTimes(2);
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
          lat: 48.85,
          lon: 2.35,
          ele: 100,
          name: zigStr("Col du Bonhomme"),
          desc: zigStr("A mountain pass"),
          cmt: null,
          sym: zigStr("Flag"),
          wptType: zigStr("TimeBarrier"),
          time: null,
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
          lat: 0,
          lon: 0,
          ele: null,
          name: zigStr("Plain"),
          desc: null,
          cmt: null,
          sym: null,
          wptType: null,
          time: null,
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
          startTime: null,
          endTime: null,
          maxCompletionTime: null,
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
      waypoints: [{ lat: 0, lon: 0, ele: null, name: null, time: null }],
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
      get totalDistance() {
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

describe("generateSoundscapeFrames bearing/pace assignment", () => {
  const elevations = [100, 120, 140, 160, 180];
  const distances = [0, 100, 200, 300, 400];
  const slopes = [0, 2, 2, 2, 0];

  it("assigns section bearing and pace to points within range", async () => {
    generateAudioFrames.mockResolvedValue([]);
    await dispatch("GENERATE_AUDIO_FRAMES", {
      elevations,
      distances,
      slopes,
      sections: [
        {
          startIndex: 1,
          endIndex: 3,
          bearing: 270,
          estimatedDuration: 600,
          totalDistance: 300,
        },
      ],
    });

    const [_bearings, , , passedBearings, passedPaces] =
      generateAudioFrames.mock.calls[0];
    expect(passedBearings[0]).toBe(0); // outside section
    expect(passedBearings[1]).toBe(270); // inside
    expect(passedBearings[2]).toBe(270); // inside
    expect(passedBearings[3]).toBe(270); // inside
    expect(passedBearings[4]).toBe(0); // outside section
    expect(passedPaces[1]).toBeCloseTo(600 / 300);
  });

  it("leaves all bearings and paces at 0 when sections is empty", async () => {
    generateAudioFrames.mockResolvedValue([]);
    await dispatch("GENERATE_AUDIO_FRAMES", {
      elevations,
      distances,
      slopes,
      sections: [],
    });

    const [, , , passedBearings, passedPaces] =
      generateAudioFrames.mock.calls[0];
    expect(Array.from(passedBearings).every((v) => v === 0)).toBe(true);
    expect(Array.from(passedPaces).every((v) => v === 0)).toBe(true);
  });

  it("extracts frame fields from Zigar proxy objects", async () => {
    generateAudioFrames.mockResolvedValue(
      Object.assign(
        [
          {
            t: 0,
            distance: 0,
            pitch: 0.5,
            intensity: 0.3,
            timbre: 0.4,
            bearing: 90,
            pace: 0.1,
          },
          {
            t: 1,
            distance: 400,
            pitch: 0.8,
            intensity: 0.6,
            timbre: 0.7,
            bearing: 180,
            pace: 0.2,
          },
        ],
        { deinit: vi.fn() },
      ),
    );
    await dispatch("GENERATE_AUDIO_FRAMES", {
      elevations,
      distances,
      slopes,
    });

    const { frames } = postMessage.mock.calls[0][0].results;
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({
      t: 0,
      distance: 0,
      pitch: 0.5,
      intensity: 0.3,
      timbre: 0.4,
      bearing: 90,
      pace: 0.1,
    });
    expect(frames[1].bearing).toBe(180);
  });
});
