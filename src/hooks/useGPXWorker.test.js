import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useStore from "../store/store.js";
import { useGPXWorker } from "./useGPXWorker.js";

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../store/store.js", () => ({
  default: vi.fn(),
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
      flush: vi.fn(),
    };
    useStore.mockImplementation((selector) => selector(mockStore));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("worker lifecycle", () => {
    it("calls initGPXWorker on mount", () => {
      renderHook(() => useGPXWorker("race1"));
      expect(mockStore.initGPXWorker).toHaveBeenCalledOnce();
    });

    it("calls terminateGPXWorker on unmount", () => {
      const { unmount } = renderHook(() => useGPXWorker("race1"));
      unmount();
      expect(mockStore.terminateGPXWorker).toHaveBeenCalledOnce();
    });

    it("returns isWorkerReady reflecting store state", () => {
      const { result } = renderHook(() => useGPXWorker("race1"));
      expect(result.current).toEqual({ isWorkerReady: false });
    });
  });

  describe("GPX loading guards", () => {
    it("does not fetch when worker is not ready", () => {
      renderHook(() => useGPXWorker("race1"));
      expect(fetch).not.toHaveBeenCalled();
    });

    it("does not fetch when raceId is absent", () => {
      mockStore.worker.isReady = true;
      renderHook(() => useGPXWorker(null));
      expect(fetch).not.toHaveBeenCalled();
    });

    it("clears sections immediately when worker ready and raceId present", () => {
      mockStore.worker.isReady = true;
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });
      renderHook(() => useGPXWorker("race1"));
      expect(mockStore.setSections).toHaveBeenCalledWith([]);
    });
  });

  describe("trail switching", () => {
    it("does not call flush on initial load", () => {
      mockStore.worker.isReady = true;
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });
      renderHook(() => useGPXWorker("race1"));
      expect(mockStore.flush).not.toHaveBeenCalled();
    });

    it("calls flush when raceId changes", () => {
      mockStore.worker.isReady = true;
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });
      const { rerender } = renderHook(({ raceId }) => useGPXWorker(raceId), {
        initialProps: { raceId: "race1" },
      });
      expect(mockStore.flush).not.toHaveBeenCalled();

      rerender({ raceId: "race2" });

      expect(mockStore.flush).toHaveBeenCalledOnce();
    });

    it("does not call flush when raceId stays the same", () => {
      mockStore.worker.isReady = true;
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });
      const { rerender } = renderHook(({ raceId }) => useGPXWorker(raceId), {
        initialProps: { raceId: "race1" },
      });
      rerender({ raceId: "race1" });
      expect(mockStore.flush).not.toHaveBeenCalled();
    });
  });

  describe("raceId validation", () => {
    it("rejects raceId with special characters", async () => {
      mockStore.worker.isReady = true;
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderHook(() => useGPXWorker("../etc/passwd"));
      await waitFor(() => expect(errorSpy).toHaveBeenCalled());
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects raceId longer than 64 characters", async () => {
      mockStore.worker.isReady = true;
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderHook(() => useGPXWorker("a".repeat(65)));
      await waitFor(() => expect(errorSpy).toHaveBeenCalled());
      expect(fetch).not.toHaveBeenCalled();
    });

    it("accepts raceId with alphanumeric, dash, and underscore", async () => {
      mockStore.worker.isReady = true;
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });
      renderHook(() => useGPXWorker("my-race_2024"));
      await waitFor(() => expect(fetch).toHaveBeenCalled());
    });
  });

  describe("fetch error handling", () => {
    it("logs error and does not call processGPXFile when response is not ok", async () => {
      mockStore.worker.isReady = true;
      fetch.mockResolvedValue({ ok: false });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderHook(() => useGPXWorker("race1"));
      await waitFor(() => expect(errorSpy).toHaveBeenCalled());
      expect(mockStore.processGPXFile).not.toHaveBeenCalled();
    });

    it("rejects GPX files larger than 50 MB", async () => {
      mockStore.worker.isReady = true;
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(51 * 1024 * 1024),
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderHook(() => useGPXWorker("race1"));
      await waitFor(() => expect(errorSpy).toHaveBeenCalled());
      expect(mockStore.processGPXFile).not.toHaveBeenCalled();
    });

    it("calls processGPXFile with the array buffer on success", async () => {
      mockStore.worker.isReady = true;
      const buffer = new ArrayBuffer(1024);
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => buffer,
      });
      renderHook(() => useGPXWorker("race1"));
      await waitFor(() =>
        expect(mockStore.processGPXFile).toHaveBeenCalledWith(buffer),
      );
    });
  });

  describe("fetch abort on cleanup", () => {
    it("aborts the in-flight fetch when the effect re-runs", async () => {
      mockStore.worker.isReady = true;
      let capturedSignal;
      fetch.mockImplementation((_, { signal }) => {
        capturedSignal = signal;
        return new Promise(() => {}); // never resolves
      });
      const { rerender } = renderHook(({ raceId }) => useGPXWorker(raceId), {
        initialProps: { raceId: "race1" },
      });
      await waitFor(() => expect(capturedSignal).toBeDefined());
      // Save the first request's signal before rerender overwrites capturedSignal
      const firstSignal = capturedSignal;
      expect(firstSignal.aborted).toBe(false);

      rerender({ raceId: "race2" });

      await waitFor(() => expect(firstSignal.aborted).toBe(true));
    });
  });
});
