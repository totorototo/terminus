import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useStore from "../store/store.js";
import { useSoundscape } from "./useSoundscape.js";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../store/store.js", () => ({
  default: vi.fn(),
}));

// ── AudioContext mock factory ──────────────────────────────────────────────────

function makeAudioParam() {
  return {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    value: 0,
  };
}

function makeOscillator() {
  return {
    type: "sine",
    frequency: makeAudioParam(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  };
}

function makeGainNode() {
  return { gain: makeAudioParam(), connect: vi.fn() };
}

function makeBiquadFilter() {
  return {
    type: "peaking",
    frequency: makeAudioParam(),
    Q: makeAudioParam(),
    gain: makeAudioParam(),
    connect: vi.fn(),
  };
}

function makePanner() {
  return {
    panningModel: "HRTF",
    distanceModel: "inverse",
    refDistance: 1,
    rolloffFactor: 0,
    positionX: makeAudioParam(),
    positionY: makeAudioParam(),
    positionZ: makeAudioParam(),
    connect: vi.fn(),
  };
}

function makeDelay() {
  return { delayTime: makeAudioParam(), connect: vi.fn() };
}

function makeAnalyser() {
  return { fftSize: 0, connect: vi.fn() };
}

function makeAudioContext(overrides = {}) {
  const ctx = {
    currentTime: 0,
    state: "running",
    destination: {},
    createOscillator: vi.fn(() => makeOscillator()),
    createGain: vi.fn(() => makeGainNode()),
    createBiquadFilter: vi.fn(() => makeBiquadFilter()),
    createPanner: vi.fn(() => makePanner()),
    createDelay: vi.fn(() => makeDelay()),
    createAnalyser: vi.fn(() => makeAnalyser()),
    close: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return ctx;
}

// ── Test data ─────────────────────────────────────────────────────────────────

// Minimal valid frame array (at least one frame is required by buildAudioGraph)
function makeFrames(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    t: i / (count - 1 || 1),
    pitch: 0.5,
    intensity: 0.5,
    timbre: 0.5,
    pace: 0.5,
    bearing: 0,
  }));
}

// ── Store mock factory ─────────────────────────────────────────────────────────

function makeStore(overrides = {}) {
  return {
    gpx: { data: null, slopes: null, cumulativeDistances: null },
    sections: [],
    workerGenerateAudioFrames: vi.fn().mockResolvedValue(makeFrames()),
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupStore(store) {
  useStore.mockImplementation((selector) => selector(store));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSoundscape", () => {
  let audioCtxMock;

  beforeEach(() => {
    audioCtxMock = makeAudioContext();
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        return audioCtxMock;
      }),
    );
    vi.stubGlobal(
      "OfflineAudioContext",
      vi.fn(function () {
        return makeAudioContext();
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ── soundState ─────────────────────────────────────────────────────────────

  describe("soundState derivation", () => {
    it('is "idle" when no gpx data is loaded', () => {
      setupStore(makeStore());
      const { result } = renderHook(() => useSoundscape());
      expect(result.current.soundState).toBe("idle");
    });

    it('is "generating" while frames are being produced', () => {
      // workerGenerateAudioFrames never resolves in this test
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
        workerGenerateAudioFrames: vi.fn(() => new Promise(() => {})),
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      expect(result.current.soundState).toBe("generating");
    });

    it('is "ready" after frames are generated', async () => {
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));
    });

    it('is "error" when frame generation fails', async () => {
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
        workerGenerateAudioFrames: vi
          .fn()
          .mockRejectedValue(new Error("WASM error")),
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("error"));
    });

    it('is "playing" after play() is called', async () => {
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      act(() => result.current.play());

      expect(result.current.soundState).toBe("playing");
    });

    it('is "paused" after pause() is called', async () => {
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      act(() => result.current.play());
      act(() => result.current.pause());

      expect(result.current.soundState).toBe("paused");
      expect(audioCtxMock.suspend).toHaveBeenCalledOnce();
    });

    it('is "playing" after resume() is called from paused', async () => {
      audioCtxMock = makeAudioContext({ state: "suspended" });
      vi.stubGlobal(
        "AudioContext",
        vi.fn(function () {
          return audioCtxMock;
        }),
      );

      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      act(() => result.current.play());

      // Manually set to paused to simulate the paused state
      act(() => {
        audioCtxMock.state = "suspended";
      });
      act(() => result.current.pause());
      act(() => result.current.resume());

      expect(result.current.soundState).toBe("playing");
      expect(audioCtxMock.resume).toHaveBeenCalledOnce();
    });

    it('returns to "ready" after stop() is called', async () => {
      // soundState has no "stopped" value — after stop, playbackState becomes
      // "stopped" internally but soundState falls through to genRecord.status ("ready")
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      act(() => result.current.play());
      expect(result.current.soundState).toBe("playing");

      act(() => result.current.stop());
      expect(result.current.soundState).toBe("ready");
    });
  });

  // ── play / stop guards ─────────────────────────────────────────────────────

  describe("play guards", () => {
    it("does not create AudioContext when soundState is not ready", () => {
      setupStore(makeStore()); // no data → idle
      const { result } = renderHook(() => useSoundscape());
      act(() => result.current.play());
      expect(AudioContext).not.toHaveBeenCalled();
    });

    it("does not play when frames are absent even if soundState is ready", async () => {
      // Resolve with empty array to test the frames?.length guard
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
        workerGenerateAudioFrames: vi.fn().mockResolvedValue([]),
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      // With empty frames, genRecord.key matches but framesRef is empty []
      // soundState will be "ready" but startAudio bails out
      await waitFor(() => expect(result.current.soundState).toBe("ready"));
      act(() => result.current.play());
      // AudioContext should not be created because frames.length === 0
      expect(AudioContext).not.toHaveBeenCalled();
    });
  });

  // ── teardown / AudioContext lifecycle ──────────────────────────────────────

  describe("teardown", () => {
    it("closes AudioContext on stop()", async () => {
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      act(() => result.current.play());
      act(() => result.current.stop());

      expect(audioCtxMock.close).toHaveBeenCalledOnce();
    });

    it("closes AudioContext on unmount while playing", async () => {
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result, unmount } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      act(() => result.current.play());
      unmount();

      expect(audioCtxMock.close).toHaveBeenCalledOnce();
    });

    it("closes AudioContext on restart()", async () => {
      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      act(() => result.current.play());
      act(() => result.current.restart());

      // close called once for teardown, then a new AudioContext created
      expect(audioCtxMock.close).toHaveBeenCalledOnce();
      expect(AudioContext).toHaveBeenCalledTimes(2);
    });

    it("does not close AudioContext if never started", () => {
      setupStore(makeStore());
      const { unmount } = renderHook(() => useSoundscape());
      unmount();
      expect(audioCtxMock.close).not.toHaveBeenCalled();
    });
  });

  // ── frame generation cancellation ─────────────────────────────────────────

  describe("frame generation cancellation", () => {
    it("cancels in-flight generation when data changes", async () => {
      let resolveFirst;
      const firstPromise = new Promise((res) => {
        resolveFirst = res;
      });
      const workerMock = vi
        .fn()
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValue(makeFrames());

      const gpxData1 = [
        [0, 0, 100],
        [1, 1, 200],
      ];
      const gpxData2 = [
        [0, 0, 100],
        [1, 1, 200],
        [2, 2, 300],
      ];

      const store = makeStore({
        gpx: {
          data: gpxData1,
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
        workerGenerateAudioFrames: workerMock,
      });
      setupStore(store);

      const { rerender, result } = renderHook(() => useSoundscape());
      // First generation is in-flight

      // Change data key by updating the store to a different dataset
      store.gpx = {
        data: gpxData2,
        slopes: [0.05, 0.02],
        cumulativeDistances: [0, 1000, 2000],
      };
      rerender();

      // Resolve the first promise after the second generation started
      await act(async () => {
        resolveFirst(makeFrames());
      });

      // Should now be in "generating" state (second request in flight) or "ready"
      // The key point: the first resolution should NOT set genRecord to ready
      // for the new dataKey — state should reflect second request
      await waitFor(() => expect(result.current.soundState).toBe("ready"));
      expect(workerMock).toHaveBeenCalledTimes(2);
    });
  });

  // ── download ───────────────────────────────────────────────────────────────

  describe("download", () => {
    it("sets isDownloading to true then false during export", async () => {
      // Mock OfflineAudioContext with renderBuffer output
      const offlineMockCtx = makeAudioContext();
      const mockBuffer = {
        getChannelData: vi.fn(() => new Float32Array(10)),
      };
      offlineMockCtx.startRendering = vi.fn().mockResolvedValue(mockBuffer);
      vi.stubGlobal(
        "OfflineAudioContext",
        vi.fn(function () {
          return offlineMockCtx;
        }),
      );

      // Mock URL and anchor element
      const revokeObjectURL = vi.fn();
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "blob:mock"),
        revokeObjectURL,
      });

      const mockClick = vi.fn();
      const mockAnchor = { href: "", download: "", click: mockClick };
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag) =>
        tag === "a" ? mockAnchor : origCreateElement(tag),
      );

      const store = makeStore({
        gpx: {
          data: [
            [0, 0, 100],
            [1, 1, 200],
          ],
          slopes: [0.05],
          cumulativeDistances: [0, 1000],
        },
      });
      setupStore(store);
      const { result } = renderHook(() => useSoundscape());
      await waitFor(() => expect(result.current.soundState).toBe("ready"));

      let downloadPromise;
      act(() => {
        downloadPromise = result.current.download();
      });

      expect(result.current.isDownloading).toBe(true);

      await act(async () => {
        await downloadPromise;
      });

      expect(result.current.isDownloading).toBe(false);
      expect(mockClick).toHaveBeenCalledOnce();
    });

    it("does not start download when frames are absent", async () => {
      setupStore(makeStore()); // no data → no frames
      const { result } = renderHook(() => useSoundscape());
      await act(async () => {
        await result.current.download();
      });
      expect(result.current.isDownloading).toBe(false);
    });
  });
});
