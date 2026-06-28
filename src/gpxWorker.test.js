import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above all imports by Vitest
vi.mock("@totorototo/navigo/web", () => ({
  default: vi.fn().mockResolvedValue(undefined),
  parseGpx: vi.fn(),
  buildTrace: vi.fn(),
}));

import { buildTrace, parseGpx } from "@totorototo/navigo/web";

// Import worker — executes self.onmessage = async function(e){...}
import "./gpxWorker.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
// navigo returns snake_case fields in kilometers; these fixtures mirror its
// real WASM shape so the worker's sanitization layer is what's under test.

function makeNavTrace(overrides = {}) {
  return {
    total_distance: 5, // km
    total_elevation_gain: 200,
    total_elevation_loss: 50,
    cumulative_distances: [0, 1, 2, 3, 4, 5], // km
    cumulative_elevation_gains: [0, 20, 60, 100, 150, 200],
    cumulative_elevation_losses: [0, 0, 10, 20, 35, 50],
    slopes: [0, 4, 4, 4, 5, 0],
    peaks: [3],
    valleys: [1],
    locations_flat: new Float64Array([
      0.0, 0.0, 100, 0.0, 0.001, 120, 0.0, 0.002, 160, 0.0, 0.003, 200, 0.0,
      0.004, 250, 0.0, 0.005, 300,
    ]),
    index_at_distance: vi.fn(() => 0),
    point_at_distance: vi.fn(() => undefined),
    slice_between_distances: vi.fn(() => undefined),
    find_closest_point: vi.fn(() => undefined),
    free: vi.fn(),
    ...overrides,
  };
}

function makeGpxTrace(overrides = {}) {
  return {
    locations_flat: new Float64Array([
      0, 0, 100, 0.002, 0.001, 120, 0.004, 0.003, 160,
    ]),
    slopes: [],
    cumulative_distances: [],
    cumulative_elevation_gains: [],
    cumulative_elevation_losses: [],
    peaks: [],
    valleys: [],
    total_distance: 0,
    total_elevation_gain: 0,
    total_elevation_loss: 0,
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
    calibration_factor: 1.1,
    calibrated_base_pace_s_per_km: 550,
    predicted_so_far_s: 1000,
    actual_elapsed_s: 1100,
    etas: [
      {
        id: 0,
        end_index: 5,
        remaining_duration_s: 300,
        cumulative_remaining_s: 300,
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
    wpt_type: "TimeBarrier",
    time: null,
    stop_duration: null,
    ...overrides,
  };
}

function makeAnalysisLeg(
  startLocation = "Start",
  endLocation = "End",
  overrides = {},
) {
  return {
    leg_id: 0,
    section_idx: 0,
    start_index: 0,
    end_index: 5,
    start_location: startLocation,
    end_location: endLocation,
    total_distance_km: 1,
    total_elevation_gain_m: 50,
    total_elevation_loss_m: 10,
    avg_slope: 5,
    max_slope: 15,
    min_elevation: 100,
    max_elevation: 150,
    bearing: 45,
    difficulty: 2,
    estimated_duration_s: 1200,
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
    stage_idx: 0,
    start_index: 0,
    end_index: 5,
    start_location: startLocation,
    end_location: endLocation,
    total_distance_km: 1,
    total_elevation_gain_m: 50,
    total_elevation_loss_m: 10,
    avg_slope: 5,
    max_slope: 15,
    min_elevation: 100,
    max_elevation: 150,
    bearing: 90,
    difficulty: 2,
    estimated_duration_s: 1200,
    pace_factor: 1.1,
    max_completion_time: 7200,
    start_time: 1_000_000,
    end_time: 1_007_200,
    cutoff_ratio: 0.9,
    stop_duration: 300,
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
    start_index: 0,
    end_index: 5,
    start_location: startLocation,
    end_location: endLocation,
    total_distance_km: 5,
    total_elevation_gain_m: 200,
    total_elevation_loss_m: 50,
    avg_slope: 4,
    max_slope: 20,
    min_elevation: 100,
    max_elevation: 300,
    bearing: 45,
    difficulty: 3,
    estimated_duration_s: 7200,
    pace_factor: 1.2,
    max_completion_time: 14400,
    start_time: 1_000_000,
    end_time: 1_014_400,
    cutoff_ratio: 0.8,
    stop_duration: 600,
    ...overrides,
  };
}

function makeAnalysisClimb(overrides = {}) {
  return {
    start_index: 2,
    end_index: 5,
    start_dist_km: 2,
    climb_dist_km: 3,
    elevation_gain: 150,
    summit_elev: 300,
    avg_gradient: 5,
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
  parseGpx.mockReturnValue(makeGpxTrace());
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
    parseGpx.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });
    const options = trace.analyze.mock.calls[0][0];
    expect(options.weather).toEqual([]);
  });

  it("converts forecasts to navigo's weather option shape, keyed by checkpoint name", async () => {
    const trace = makeGpxTrace();
    parseGpx.mockReturnValue(trace);
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
    parseGpx.mockReturnValue(trace);
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
        find_closest_point: vi.fn().mockReturnValue({
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
              end_index: 9,
              remaining_duration_s: 600,
              cumulative_remaining_s: 600,
            },
          ],
        }),
      })),
    });
    parseGpx.mockReturnValue(trace);

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
              wpt_type: "TimeBarrier",
            }),
          ],
        }),
      ),
    });
    parseGpx.mockReturnValue(trace);
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
              wpt_type: null,
              time: null,
            }),
          ],
        }),
      ),
    });
    parseGpx.mockReturnValue(trace);
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
    parseGpx.mockReturnValue(trace);
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
              start_time: null,
              end_time: null,
              max_completion_time: null,
            }),
          ],
        }),
      ),
    });
    parseGpx.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    const section = results.sections[0];
    expect(section.startTime).toBeNull();
    expect(section.endTime).toBeNull();
    expect(section.maxCompletionTime).toBeNull();
  });

  it("maps navigo climbs into the app's climb shape (km → m)", async () => {
    const trace = makeGpxTrace({ climbs: vi.fn(() => [makeAnalysisClimb()]) });
    parseGpx.mockReturnValue(trace);
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
    parseGpx.mockReturnValue(trace);
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
    parseGpx.mockReturnValue(trace);
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
    parseGpx.mockReturnValue(trace);
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
    parseGpx.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.metadata.name).toBe("UTMB 2024");
    expect(results.metadata.description).toBe("Ultra-Trail du Mont-Blanc");
  });

  it("handles null metadata fields", async () => {
    const trace = makeGpxTrace();
    parseGpx.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });

    const { results } = postMessage.mock.calls[0][0];
    expect(results.metadata.name).toBeNull();
    expect(results.metadata.description).toBeNull();
  });

  it("calls free() after processing to release WASM memory", async () => {
    const trace = makeGpxTrace();
    parseGpx.mockReturnValue(trace);
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new Uint8Array(0) });
    expect(trace.free).toHaveBeenCalledOnce();
  });
});
