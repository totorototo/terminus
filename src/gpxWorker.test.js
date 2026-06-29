import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above all imports by Vitest
vi.mock("@totorototo/navigo/web", () => ({
  default: vi.fn().mockResolvedValue(undefined),
  parseGpxAll: vi.fn(),
  buildTrace: vi.fn(),
}));

import { buildTrace, parseGpxAll } from "@totorototo/navigo/web";

// Import worker — executes self.onmessage = async function(e){...}
import "./gpxWorker.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
// navigo returns camelCase fields in kilometers; these fixtures mirror its
// real WASM shape so the worker's sanitization layer is what's under test.

function makeNavTrace(overrides = {}) {
  return {
    totalDistance: 5, // km
    totalElevationGain: 200,
    totalElevationLoss: 50,
    getCumulativeDistances: vi.fn(() => [0, 1, 2, 3, 4, 5]), // km
    getCumulativeElevationGains: vi.fn(() => [0, 20, 60, 100, 150, 200]),
    getCumulativeElevationLosses: vi.fn(() => [0, 0, 10, 20, 35, 50]),
    getSlopes: vi.fn(() => [0, 4, 4, 4, 5, 0]),
    getPeaks: vi.fn(() => [3]),
    getValleys: vi.fn(() => [1]),
    getLocationsFlat: vi.fn(
      () =>
        new Float64Array([
          0.0, 0.0, 100, 0.0, 0.001, 120, 0.0, 0.002, 160, 0.0, 0.003, 200, 0.0,
          0.004, 250, 0.0, 0.005, 300,
        ]),
    ),
    indexAtDistance: vi.fn(() => 0),
    pointAtDistance: vi.fn(() => undefined),
    sliceBetweenDistances: vi.fn(() => undefined),
    findClosestPoint: vi.fn(() => undefined),
    free: vi.fn(),
    ...overrides,
  };
}

function makeGpxTrace(overrides = {}) {
  return {
    getLocationsFlat: vi.fn(
      () => new Float64Array([0, 0, 100, 0.002, 0.001, 120, 0.004, 0.003, 160]),
    ),
    getSlopes: vi.fn(() => []),
    getCumulativeDistances: vi.fn(() => []),
    getCumulativeElevationGains: vi.fn(() => []),
    getCumulativeElevationLosses: vi.fn(() => []),
    getPeaks: vi.fn(() => []),
    getValleys: vi.fn(() => []),
    totalDistance: 0,
    totalElevationGain: 0,
    totalElevationLoss: 0,
    climbs: vi.fn(() => []),
    analyze: vi.fn(() => ({
      waypoints: [],
      legs: [],
      sections: null,
      stages: null,
      metadata: { name: null, description: null },
    })),
    recalibrate: vi.fn(() => ({ sections: null, stages: null })),
    free: vi.fn(),
    ...overrides,
  };
}

function makeRecalibration(overrides = {}) {
  return {
    calibrationFactor: 1.1,
    calibratedBasePaceSPerKm: 550,
    predictedSoFarS: 1000,
    actualElapsedS: 1100,
    etas: [
      {
        id: 0,
        endIndex: 5,
        remainingDurationS: 300,
        cumulativeRemainingS: 300,
      },
    ],
    ...overrides,
  };
}

function analysisWith(fields) {
  return () => ({
    waypoints: [],
    legs: [],
    sections: null,
    stages: null,
    metadata: { name: null, description: null },
    ...fields,
  });
}

function makeAnalysisWaypoint(overrides = {}) {
  return {
    latitude: 48.85,
    longitude: 2.35,
    elevation: 100,
    name: "Col du Bonhomme",
    wptType: "TimeBarrier",
    time: null,
    stopDuration: null,
    ...overrides,
  };
}

function makeAnalysisLeg(
  startLocation = "Start",
  endLocation = "End",
  overrides = {},
) {
  return {
    legId: 0,
    sectionIdx: 0,
    startIndex: 0,
    endIndex: 5,
    startLocation,
    endLocation,
    totalDistanceKm: 1,
    totalElevationGainM: 50,
    totalElevationLossM: 10,
    avgSlope: 5,
    maxSlope: 15,
    minElevation: 100,
    maxElevation: 150,
    bearing: 45,
    difficulty: 2,
    estimatedDurationS: 1200,
    ...overrides,
  };
}

function makeAnalysisSection(
  startLocation = "CP1",
  endLocation = "CP2",
  overrides = {},
) {
  return {
    id: 0,
    stageIdx: 0,
    startIndex: 0,
    endIndex: 5,
    startLocation,
    endLocation,
    totalDistanceKm: 1,
    totalElevationGainM: 50,
    totalElevationLossM: 10,
    avgSlope: 5,
    maxSlope: 15,
    minElevation: 100,
    maxElevation: 150,
    bearing: 90,
    difficulty: 2,
    estimatedDurationS: 1200,
    paceFactor: 1.1,
    maxCompletionTime: 7200,
    startTime: 1_000_000,
    endTime: 1_007_200,
    cutoffRatio: 0.9,
    stopDuration: 300,
    ...overrides,
  };
}

function makeAnalysisStage(
  startLocation = "Start",
  endLocation = "Finish",
  overrides = {},
) {
  return {
    id: 0,
    startIndex: 0,
    endIndex: 5,
    startLocation,
    endLocation,
    totalDistanceKm: 5,
    totalElevationGainM: 200,
    totalElevationLossM: 50,
    avgSlope: 4,
    maxSlope: 20,
    minElevation: 100,
    maxElevation: 300,
    bearing: 45,
    difficulty: 3,
    estimatedDurationS: 7200,
    paceFactor: 1.2,
    maxCompletionTime: 14400,
    startTime: 1_000_000,
    endTime: 1_014_400,
    cutoffRatio: 0.8,
    stopDuration: 600,
    ...overrides,
  };
}

function makeAnalysisClimb(overrides = {}) {
  return {
    startIndex: 2,
    endIndex: 5,
    startDistKm: 2,
    climbDistKm: 3,
    elevationGain: 150,
    summitElev: 300,
    avgGradient: 5,
    ...overrides,
  };
}

async function dispatch(type, data = {}, id = "req-1") {
  await self.onmessage({ data: { type, data, id } });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("postMessage", vi.fn());
  buildTrace.mockReturnValue(makeNavTrace());
  parseGpxAll.mockReturnValue(makeGpxTrace());
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

  it("routes PROCESS_GPS_DATA and posts GPS_DATA_PROCESSED", async () => {
    await dispatch("PROCESS_GPS_DATA", { coordinates: [[0, 0, 0]] });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GPS_DATA_PROCESSED", id: "req-1" }),
    );
  });

  it("routes PROCESS_GPX_FILE and posts GPX_FILE_PROCESSED", async () => {
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GPX_FILE_PROCESSED", id: "req-1" }),
      expect.arrayContaining([expect.any(ArrayBuffer)]),
    );
  });

  it("transfers full-resolution route coordinates as flat [lat, lon, ele]", async () => {
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });
    const [message, transfer] = postMessage.mock.calls[0];
    const { routeLatLonEle } = message.results;
    // navigo gives [lon, lat, alt]; the worker flips it to [lat, lon, ele].
    expect(Array.from(routeLatLonEle)).toEqual([
      0.0, 0.0, 100, 0.001, 0.002, 120, 0.003, 0.004, 160,
    ]);
    expect(transfer).toEqual([routeLatLonEle.buffer]);
  });

  it("forwards an empty weather option array when no forecasts are given", async () => {
    const trace = makeGpxTrace();
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });
    const options = trace.analyze.mock.calls[0][0];
    expect(options.weather).toEqual([]);
  });

  it("converts forecasts to navigo's weather option shape, keyed by checkpoint name", async () => {
    const trace = makeGpxTrace();
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", {
      gpxBytes: new Uint8Array(0),
      weatherByCheckpoint: {
        Summit: { temp: 28, humidity: 80, wind: 35, precipitation: 60 },
      },
    });
    const options = trace.analyze.mock.calls[0][0];
    expect(options.weather).toEqual([
      {
        name: "Summit",
        temperatureC: 28,
        humidityPct: 80,
        windKmh: 35,
        precipProbPct: 60,
      },
    ]);
  });

  it("fills neutral defaults for forecast fields that are not finite", async () => {
    const trace = makeGpxTrace();
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", {
      gpxBytes: new Uint8Array(0),
      weatherByCheckpoint: {
        Col: {
          temp: null,
          humidity: undefined,
          wind: NaN,
          precipitation: null,
        },
      },
    });
    const options = trace.analyze.mock.calls[0][0];
    expect(options.weather[0]).toEqual({
      name: "Col",
      temperatureC: 12.0,
      humidityPct: 50.0,
      windKmh: 0.0,
      precipProbPct: 0.0,
    });
  });

  it("routes FIND_CLOSEST_LOCATION and posts CLOSEST_POINT_FOUND", async () => {
    buildTrace.mockReturnValue(
      makeNavTrace({
        findClosestPoint: vi.fn().mockReturnValue({
          location: { longitude: 2, latitude: 1, altitude: 3 },
          index: 0,
          distance: 0.01,
        }),
      }),
    );
    await dispatch("FIND_CLOSEST_LOCATION", {
      coordinates: [[0, 0, 0]],
      target: [1, 2, 3],
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CLOSEST_POINT_FOUND" }),
    );
  });

  it("routes RECALIBRATE and posts a null RECALIBRATED payload when navigo finds no boundaries", async () => {
    await dispatch("RECALIBRATE", {
      gpxBytes: new Uint8Array(0),
      currentIndex: 5,
      actualElapsedS: 1000,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RECALIBRATED",
        id: "req-1",
        results: { recalibration: { section: null, stage: null } },
      }),
    );
  });

  it("calls navigo's Trace.recalibrate with mapped options and sanitizes the result", async () => {
    const trace = makeGpxTrace({
      recalibrate: vi.fn(() => ({
        sections: makeRecalibration(),
        stages: makeRecalibration({
          etas: [
            {
              id: 0,
              endIndex: 9,
              remainingDurationS: 600,
              cumulativeRemainingS: 600,
            },
          ],
        }),
      })),
    });
    parseGpxAll.mockReturnValue(trace);

    await dispatch("RECALIBRATE", {
      gpxBytes: new Uint8Array(0),
      currentIndex: 5,
      actualElapsedS: 1100,
      basePaceSPerKm: 480,
      kFatigue: 0.003,
      lifeBaseStopS: 1800,
      weatherByCheckpoint: {
        Summit: { temp: 20, humidity: 60, wind: 10, precipitation: 5 },
      },
    });

    expect(trace.recalibrate).toHaveBeenCalledWith({
      basePaceSPerKm: 480,
      kFatigue: 0.003,
      lifeBaseStopS: 1800,
      currentIndex: 5,
      actualElapsedS: 1100,
      weather: [
        {
          name: "Summit",
          temperatureC: 20,
          humidityPct: 60,
          windKmh: 10,
          precipProbPct: 5,
        },
      ],
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RECALIBRATED",
        id: "req-1",
        results: {
          recalibration: {
            section: {
              calibrationFactor: 1.1,
              calibratedBasePaceSPerKm: 550,
              predictedSoFarS: 1000,
              actualElapsedS: 1100,
              etas: [
                {
                  id: 0,
                  endIndex: 5,
                  remainingDurationS: 300,
                  cumulativeRemainingS: 300,
                },
              ],
            },
            stage: {
              calibrationFactor: 1.1,
              calibratedBasePaceSPerKm: 550,
              predictedSoFarS: 1000,
              actualElapsedS: 1100,
              etas: [
                {
                  id: 0,
                  endIndex: 9,
                  remainingDurationS: 600,
                  cumulativeRemainingS: 600,
                },
              ],
            },
          },
        },
      }),
    );

    expect(trace.free).toHaveBeenCalled();
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

describe("processSections coordinate validation", () => {
  it("rejects missing coordinates", async () => {
    await dispatch("PROCESS_SECTIONS", { sections: [] });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });

  it("rejects empty coordinates array", async () => {
    await dispatch("PROCESS_SECTIONS", { coordinates: [], sections: [] });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });

  it("rejects non-array coordinates", async () => {
    await dispatch("PROCESS_SECTIONS", { coordinates: "bad", sections: [] });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });
});

describe("processGPXFile sanitization", () => {
  it("maps navigo waypoints into the app's waypoint shape", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(
        analysisWith({
          waypoints: [
            makeAnalysisWaypoint({
              latitude: 48.85,
              longitude: 2.35,
              elevation: 100,
              name: "Col du Bonhomme",
              wptType: "TimeBarrier",
            }),
          ],
        }),
      ),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    const wpt = results.waypoints[0];
    expect(wpt.name).toBe("Col du Bonhomme");
    expect(wpt.lat).toBe(48.85);
    expect(wpt.lon).toBe(2.35);
    expect(wpt.ele).toBe(100);
    expect(wpt.wptType).toBe("TimeBarrier");
    // navigo's WASM bindings don't expose desc/comment/symbol yet.
    expect(wpt.desc).toBeNull();
    expect(wpt.cmt).toBeNull();
    expect(wpt.sym).toBeNull();
  });

  it("preserves null optional waypoint fields as null", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(
        analysisWith({
          waypoints: [
            makeAnalysisWaypoint({
              latitude: 0,
              longitude: 0,
              elevation: null,
              name: "Plain",
              wptType: null,
              time: null,
            }),
          ],
        }),
      ),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    const wpt = results.waypoints[0];
    expect(wpt.wptType).toBeNull();
    expect(wpt.time).toBeNull();
    expect(wpt.ele).toBeNull();
  });

  it("carries section timing fields through as numbers", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(analysisWith({ sections: [makeAnalysisSection()] })),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    const section = results.sections[0];
    expect(typeof section.startTime).toBe("number");
    expect(typeof section.endTime).toBe("number");
    expect(typeof section.maxCompletionTime).toBe("number");
    expect(section.startTime).toBe(1_000_000);
    expect(section.endTime).toBe(1_007_200);
    expect(section.maxCompletionTime).toBe(7200);
  });

  it("preserves null timestamps as null", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(
        analysisWith({
          sections: [
            makeAnalysisSection("A", "B", {
              startTime: null,
              endTime: null,
              maxCompletionTime: null,
            }),
          ],
        }),
      ),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    const section = results.sections[0];
    expect(section.startTime).toBeNull();
    expect(section.endTime).toBeNull();
    expect(section.maxCompletionTime).toBeNull();
  });

  it("maps navigo climbs into the app's climb shape (km → m)", async () => {
    const trace = makeGpxTrace({ climbs: vi.fn(() => [makeAnalysisClimb()]) });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    const climb = results.climbs[0];
    expect(climb.startIndex).toBe(2);
    expect(climb.endIndex).toBe(5);
    expect(climb.startDistM).toBe(2000);
    expect(climb.climbDistM).toBe(3000);
    expect(climb.elevationGain).toBe(150);
    expect(climb.summitElev).toBe(300);
    expect(climb.avgGradient).toBe(5);
  });

  it("builds leg segmentId from sectionIdx and location names", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(
        analysisWith({ legs: [makeAnalysisLeg("Départ", "Checkpoint 1")] }),
      ),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.legs[0].segmentId).toBe("leg-0-Départ-Checkpoint 1");
  });

  it("builds section sectionId from stageIdx and location names", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(
        analysisWith({
          sections: [makeAnalysisSection("Start", "Barrier 1")],
        }),
      ),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.sections[0].sectionId).toBe("section-0-Start-Barrier 1");
  });

  it("builds stage stageId from location names", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(
        analysisWith({ stages: [makeAnalysisStage("Start", "Finish")] }),
      ),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.stages[0].stageId).toBe("stage-Start-Finish");
  });

  it("carries metadata through", async () => {
    const trace = makeGpxTrace({
      analyze: vi.fn(
        analysisWith({
          metadata: {
            name: "UTMB 2024",
            description: "Ultra-Trail du Mont-Blanc",
          },
        }),
      ),
    });
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.metadata.name).toBe("UTMB 2024");
    expect(results.metadata.description).toBe("Ultra-Trail du Mont-Blanc");
  });

  it("handles null metadata fields", async () => {
    const trace = makeGpxTrace();
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.metadata.name).toBeNull();
    expect(results.metadata.description).toBeNull();
  });

  it("calls free() after processing to release WASM memory", async () => {
    const trace = makeGpxTrace();
    parseGpxAll.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });
    expect(trace.free).toHaveBeenCalledOnce();
  });
});
