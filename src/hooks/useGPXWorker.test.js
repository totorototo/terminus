import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadLocalGpx } from "../lib/localGpx.js";
import useStore from "../store/store.js";
import { useGPXWorker } from "./useGPXWorker.js";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../store/store.js", () => ({
  default: vi.fn(),
}));

vi.mock("../lib/localGpx.js", () => ({
  loadLocalGpx: vi.fn(),
}));

describe("useGPXWorker", () => {
  let mockStore;

  beforeEach(() => {
    mockStore = {
      initGPXWorker: vi.fn(),
      terminateGPXWorker: vi.fn(),
      worker: { isReady: false },
      processGPXFile: vi.fn().mockResolvedValue(undefined),
      setSections: vi.fn(),
      setLegs: vi.fn(),
    };
    useStore.mockImplementation((selector) => selector(mockStore));
    loadLocalGpx.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("worker lifecycle", () => {
    it("calls initGPXWorker on mount", () => {
      renderHook(() => useGPXWorker());
      expect(mockStore.initGPXWorker).toHaveBeenCalledOnce();
    });

    it("calls terminateGPXWorker on unmount", () => {
      const { unmount } = renderHook(() => useGPXWorker());
      unmount();
      expect(mockStore.terminateGPXWorker).toHaveBeenCalledOnce();
    });

    it("returns isWorkerReady reflecting store state", () => {
      const { result } = renderHook(() => useGPXWorker());
      expect(result.current).toEqual({ isWorkerReady: false, missing: false });
    });
  });

  describe("loading the stored GPX", () => {
    it("does not read storage before the worker is ready", () => {
      renderHook(() => useGPXWorker());
      expect(loadLocalGpx).not.toHaveBeenCalled();
    });

    it("clears legs and sections, then processes the stored bytes", async () => {
      const bytes = new ArrayBuffer(100);
      loadLocalGpx.mockResolvedValue({ name: "race.gpx", bytes });
      mockStore.worker.isReady = true;

      renderHook(() => useGPXWorker());

      expect(mockStore.setSections).toHaveBeenCalledWith([]);
      expect(mockStore.setLegs).toHaveBeenCalledWith([]);
      await waitFor(() =>
        expect(mockStore.processGPXFile).toHaveBeenCalledWith(bytes, {
          fileName: "race.gpx",
        }),
      );
    });

    it("reports missing when no GPX is stored", async () => {
      mockStore.worker.isReady = true;

      const { result } = renderHook(() => useGPXWorker());

      await waitFor(() => expect(result.current.missing).toBe(true));
      expect(mockStore.processGPXFile).not.toHaveBeenCalled();
    });

    it("ignores a load that resolves after unmount", async () => {
      let resolve;
      loadLocalGpx.mockReturnValue(new Promise((r) => (resolve = r)));
      mockStore.worker.isReady = true;

      const { unmount } = renderHook(() => useGPXWorker());
      unmount();
      resolve({ name: "race.gpx", bytes: new ArrayBuffer(1) });

      await Promise.resolve();
      expect(mockStore.processGPXFile).not.toHaveBeenCalled();
    });
  });
});
