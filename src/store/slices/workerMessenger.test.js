import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWorkerMessenger } from "./workerMessenger.js";
import { MESSAGE_TYPES } from "./workerTypes.js";

describe("WorkerMessenger", () => {
  let mockWorker;
  let callbacks;
  let messenger;

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
    };

    callbacks = {
      onProgress: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
      onTimeout: vi.fn(),
      onProcessingStart: vi.fn(),
    };

    messenger = createWorkerMessenger(mockWorker, callbacks);
  });

  describe("send", () => {
    it("should send message to worker with correct structure", async () => {
      const sendPromise = messenger.send("TEST_MESSAGE", { test: "data" });

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "TEST_MESSAGE",
          data: { test: "data" },
          id: expect.any(Number),
        }),
      );
    });

    it("should call onProcessingStart callback", async () => {
      messenger.send("TEST", {});
      await new Promise((resolve) => setImmediate(resolve));

      expect(callbacks.onProcessingStart).toHaveBeenCalled();
    });

    it("should reject if worker is null", async () => {
      const nullMessenger = createWorkerMessenger(null, callbacks);

      await expect(nullMessenger.send("TEST", {})).rejects.toThrow(
        "Worker not ready",
      );
    });

    it("should generate unique message IDs", async () => {
      messenger.send("TEST_1", {});
      messenger.send("TEST_2", {});

      await new Promise((resolve) => setImmediate(resolve));

      const call1 = mockWorker.postMessage.mock.calls[0][0];
      const call2 = mockWorker.postMessage.mock.calls[1][0];

      expect(call1.id).not.toBe(call2.id);
    });
  });

  describe("handleMessage - Progress", () => {
    it("should handle progress messages", async () => {
      const onProgress = vi.fn();
      const sendPromise = messenger.send("TEST", {}, onProgress);

      await new Promise((resolve) => setImmediate(resolve));

      const messageId = mockWorker.postMessage.mock.calls[0][0].id;

      messenger.handleMessage({
        data: {
          type: MESSAGE_TYPES.RESPONSE.PROGRESS,
          id: messageId,
          progress: 50,
          message: "Halfway done",
        },
      });

      expect(callbacks.onProgress).toHaveBeenCalledWith(50, "Halfway done");
      expect(onProgress).toHaveBeenCalledWith(50, "Halfway done");
    });

    it("should not call progress if request not found", () => {
      messenger.handleMessage({
        data: {
          type: MESSAGE_TYPES.RESPONSE.PROGRESS,
          id: 999999,
          progress: 50,
          message: "Test",
        },
      });

      expect(callbacks.onProgress).not.toHaveBeenCalled();
    });
  });

  describe("handleMessage - Success", () => {
    it("should resolve promise on success response", async () => {
      const sendPromise = messenger.send("TEST", {});

      await new Promise((resolve) => setImmediate(resolve));

      const messageId = mockWorker.postMessage.mock.calls[0][0].id;

      messenger.handleMessage({
        data: {
          type: "POINTS_FOUND",
          id: messageId,
          results: { data: "test result" },
        },
      });

      const result = await sendPromise;
      expect(result).toEqual({ data: "test result" });
      expect(callbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe("handleMessage - Error", () => {
    it("should reject promise on error response", async () => {
      const sendPromise = messenger.send("TEST", {});

      await new Promise((resolve) => setImmediate(resolve));

      const messageId = mockWorker.postMessage.mock.calls[0][0].id;

      messenger.handleMessage({
        data: {
          type: MESSAGE_TYPES.RESPONSE.ERROR,
          id: messageId,
          error: "Test error",
        },
      });

      await expect(sendPromise).rejects.toThrow("Test error");
      expect(callbacks.onError).toHaveBeenCalledWith("Test error");
    });
  });

  describe("timeout", () => {
    it("should timeout after WORKER_TIMEOUT", async () => {
      vi.useFakeTimers();

      const sendPromise = messenger.send("SLOW_REQUEST", {});

      // Let the promise initialize
      await Promise.resolve();

      vi.advanceTimersByTime(60001);

      await expect(sendPromise).rejects.toThrow(
        "Worker request SLOW_REQUEST timed out after 60000ms",
      );
      expect(callbacks.onTimeout).toHaveBeenCalledWith(
        "Worker request SLOW_REQUEST timed out after 60000ms",
      );

      vi.useRealTimers();
    });

    it("should not timeout if response received in time", async () => {
      vi.useFakeTimers();

      const sendPromise = messenger.send("FAST", {});

      // Let the promise initialize
      await Promise.resolve();

      const messageId = mockWorker.postMessage.mock.calls[0][0].id;

      // Respond before timeout
      messenger.handleMessage({
        data: {
          type: "POINTS_FOUND",
          id: messageId,
          results: { success: true },
        },
      });

      const result = await sendPromise;
      expect(result).toEqual({ success: true });

      // Advance time past timeout - should not trigger
      vi.advanceTimersByTime(60000);

      expect(callbacks.onTimeout).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("cleanup", () => {
    it("should reject all pending requests on cleanup", async () => {
      const promise1 = messenger.send("TEST_1", {});
      const promise2 = messenger.send("TEST_2", {});

      // Let promises initialize
      await Promise.resolve();

      const error = new Error("Worker terminated");
      messenger.cleanup(error);

      await expect(promise1).rejects.toThrow("Worker terminated");
      await expect(promise2).rejects.toThrow("Worker terminated");
    });

    it("should clear all timeouts on cleanup", async () => {
      vi.useFakeTimers();

      const promise1 = messenger.send("TEST_1", {});
      const promise2 = messenger.send("TEST_2", {});

      // Let promises initialize
      await Promise.resolve();

      messenger.cleanup(new Error("Terminated"));

      // Catch the rejections to avoid unhandled promise errors
      await expect(promise1).rejects.toThrow("Terminated");
      await expect(promise2).rejects.toThrow("Terminated");

      // Advance past timeout - should not cause issues since cleaned up
      vi.advanceTimersByTime(60000);

      expect(callbacks.onTimeout).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("concurrent requests", () => {
    it("should handle multiple concurrent requests independently", async () => {
      const promise1 = messenger.send("REQUEST_1", { data: 1 });
      const promise2 = messenger.send("REQUEST_2", { data: 2 });

      await new Promise((resolve) => setImmediate(resolve));

      const message1Id = mockWorker.postMessage.mock.calls[0][0].id;
      const message2Id = mockWorker.postMessage.mock.calls[1][0].id;

      // Respond to second request first
      messenger.handleMessage({
        data: {
          type: "POINTS_FOUND",
          id: message2Id,
          results: { data: 2 },
        },
      });

      const result2 = await promise2;
      expect(result2).toEqual({ data: 2 });

      // Respond to first request
      messenger.handleMessage({
        data: {
          type: "POINTS_FOUND",
          id: message1Id,
          results: { data: 1 },
        },
      });

      const result1 = await promise1;
      expect(result1).toEqual({ data: 1 });
    });

    it("should not cross-contaminate progress callbacks", async () => {
      const onProgress1 = vi.fn();
      const onProgress2 = vi.fn();

      messenger.send("REQUEST_1", {}, onProgress1);
      messenger.send("REQUEST_2", {}, onProgress2);

      await new Promise((resolve) => setImmediate(resolve));

      const message1Id = mockWorker.postMessage.mock.calls[0][0].id;
      const message2Id = mockWorker.postMessage.mock.calls[1][0].id;

      // Send progress for first request
      messenger.handleMessage({
        data: {
          type: MESSAGE_TYPES.RESPONSE.PROGRESS,
          id: message1Id,
          progress: 30,
          message: "Request 1 progress",
        },
      });

      expect(onProgress1).toHaveBeenCalledWith(30, "Request 1 progress");
      expect(onProgress2).not.toHaveBeenCalled();

      // Send progress for second request
      messenger.handleMessage({
        data: {
          type: MESSAGE_TYPES.RESPONSE.PROGRESS,
          id: message2Id,
          progress: 60,
          message: "Request 2 progress",
        },
      });

      expect(onProgress2).toHaveBeenCalledWith(60, "Request 2 progress");
      expect(onProgress1).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe("edge cases", () => {
    it("should handle missing optional callbacks gracefully", () => {
      const messengerWithoutCallbacks = createWorkerMessenger(mockWorker, {});

      expect(() => {
        messengerWithoutCallbacks.send("TEST", {});
      }).not.toThrow();
    });

    it("should handle response without results field", async () => {
      const sendPromise = messenger.send("TEST", {});

      await new Promise((resolve) => setImmediate(resolve));

      const messageId = mockWorker.postMessage.mock.calls[0][0].id;

      messenger.handleMessage({
        data: {
          type: "POINTS_FOUND",
          id: messageId,
          // No results field
        },
      });

      const result = await sendPromise;
      expect(result).toEqual({
        type: "POINTS_FOUND",
        id: messageId,
      });
    });

    it("should handle error without error message", async () => {
      const sendPromise = messenger.send("TEST", {});

      await new Promise((resolve) => setImmediate(resolve));

      const messageId = mockWorker.postMessage.mock.calls[0][0].id;

      messenger.handleMessage({
        data: {
          type: MESSAGE_TYPES.RESPONSE.ERROR,
          id: messageId,
          // No error field
        },
      });

      await expect(sendPromise).rejects.toThrow("Unknown worker error");
    });
  });
});
