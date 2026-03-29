import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above all imports by Vitest
vi.mock("../zig/gpx.zig", () => ({ readGPXComplete: vi.fn() }));
vi.mock("../zig/trace.zig", () => ({
  __zigar: { init: vi.fn().mockResolvedValue(undefined) },
  Trace: { init: vi.fn() },
}));
vi.mock("../zig/soundscape.zig", () => ({ generateAudioFrames: vi.fn() }));

import { readGPXComplete } from "../zig/gpx.zig";
import { generateAudioFrames } from "../zig/soundscape.zig";
import { Trace } from "../zig/trace.zig";

// Import worker — executes self.onmessage = async function(e){...}
import "./gpxWorker.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function zigStr(value) {
  return { string: value };
}

function makeTrace(overrides = {}) {
  return {
    totalDistance: 5000,
    totalElevation: 200,
    totalElevationLoss: 50,
    cumulativeDistances: [0, 1000, 2000, 3000, 4000, 5000],
    cumulativeElevations: [0, 20, 60, 100, 150, 200],
    cumulativeElevationLoss: [0, 0, 10, 20, 35, 50],
    points: [
      [0.0, 0.0, 100],
      [0.001, 0.0, 120],
      [0.002, 0.0, 160],
      [0.003, 0.0, 200],
      [0.004, 0.0, 250],
      [0.005, 0.0, 300],
    ],
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
      valueOf: () => ({ points: [], cumulativeDistances: [] }),
      climbs: [],
    },
    waypoints: [],
    legs: null,
    sections: null,
    stages: null,
    deinit: vi.fn(),
    ...overrides,
  };
}

async function dispatch(type, data = {}, id = "req-1") {
  await self.onmessage({ data: { type, data, id } });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("postMessage", vi.fn());
  Trace.init.mockReturnValue(makeTrace());
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
    Trace.init.mockReturnValue({
      ...makeTrace(),
      valueOf: () => ({ points: [], totalDistance: 100 }),
    });
    await dispatch("PROCESS_GPS_DATA", { coordinates: [[0, 0, 0]] });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GPS_DATA_PROCESSED", id: "req-1" }),
    );
  });

  it("routes PROCESS_GPX_FILE and posts GPX_FILE_PROCESSED", async () => {
    readGPXComplete.mockResolvedValue(makeGpxData());
    await dispatch("PROCESS_GPX_FILE", { gpxBytes: new ArrayBuffer(0) });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GPX_FILE_PROCESSED", id: "req-1" }),
    );
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

  it("routes GENERATE_AUDIO_FRAMES and posts AUDIO_FRAMES_READY", async () => {
    generateAudioFrames.mockResolvedValue([]);
    await dispatch("GENERATE_AUDIO_FRAMES", {
      elevations: [100],
      distances: [0],
      slopes: [0],
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "AUDIO_FRAMES_READY" }),
    );
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
        valueOf: () => ({}),
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
    generateAudioFrames.mockResolvedValue([
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
    ]);
    await dispatch("GENERATE_AUDIO_FRAMES", {
      elevations,
      distances,
      slopes,
    });

    const { frames } = postMessage.mock.calls[0][0];
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
