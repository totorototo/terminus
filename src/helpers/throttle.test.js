import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { throttle } from "./throttle";

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic functionality", () => {
    it("should call function immediately on first invocation", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should not call function again within delay period", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call function again after delay has passed", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should not call function if delay has not fully elapsed", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled();
      vi.advanceTimersByTime(999);
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("arguments handling", () => {
    it("should pass arguments to the throttled function", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled("arg1", "arg2", 123);

      expect(fn).toHaveBeenCalledWith("arg1", "arg2", 123);
    });

    it("should pass latest arguments when called after delay", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled("first");
      throttled("ignored");

      vi.advanceTimersByTime(1000);
      throttled("second");

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, "first");
      expect(fn).toHaveBeenNthCalledWith(2, "second");
    });

    it("should handle complex arguments", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);
      const obj = { id: 1, value: "test" };
      const arr = [1, 2, 3];

      throttled(obj, arr, null, undefined, true);

      expect(fn).toHaveBeenCalledWith(obj, arr, null, undefined, true);
    });
  });

  describe("multiple calls", () => {
    it("should throttle rapid successive calls", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      for (let i = 0; i < 10; i++) {
        throttled(i);
      }

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(0);
    });

    it("should allow calls at exact delay intervals", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled(1); // t=0
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      throttled(2); // t=1000
      expect(fn).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(1000);
      throttled(3); // t=2000
      expect(fn).toHaveBeenCalledTimes(3);

      vi.advanceTimersByTime(1000);
      throttled(4); // t=3000
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it("should handle irregular timing patterns", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000);

      throttled("a"); // t=0
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      throttled("b"); // t=500 (blocked)

      vi.advanceTimersByTime(600);
      throttled("c"); // t=1100 (allowed)
      expect(fn).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(300);
      throttled("d"); // t=1400 (blocked)

      vi.advanceTimersByTime(800);
      throttled("e"); // t=2200 (allowed)
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe("edge cases", () => {
    it("should handle zero delay", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 0);

      throttled();
      throttled();
      throttled();

      // With 0 delay, each call should execute
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should handle very small delays", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1);

      throttled();
      throttled();

      vi.advanceTimersByTime(1);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should handle very large delays", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 1000000);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(999999);
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should maintain separate state for different throttled functions", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const throttled1 = throttle(fn1, 1000);
      const throttled2 = throttle(fn2, 1000);

      throttled1("a");
      throttled2("b");

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);

      throttled1("c");
      throttled2("d");

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);

      throttled1("e");
      throttled2("f");

      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(2);
    });
  });

  describe("use case: scroll handler", () => {
    it("should throttle rapid scroll events", () => {
      const handleScroll = vi.fn();
      const throttledScroll = throttle(handleScroll, 100);

      // Simulate rapid scrolling (10 events in quick succession)
      for (let i = 0; i < 10; i++) {
        throttledScroll({ scrollY: i * 100 });
      }

      expect(handleScroll).toHaveBeenCalledTimes(1);

      // After 100ms, next scroll should trigger
      vi.advanceTimersByTime(100);
      throttledScroll({ scrollY: 1000 });

      expect(handleScroll).toHaveBeenCalledTimes(2);
    });
  });

  describe("use case: resize handler", () => {
    it("should throttle rapid resize events", () => {
      const handleResize = vi.fn();
      const throttledResize = throttle(handleResize, 200);

      // Simulate rapid resizing
      throttledResize({ width: 800, height: 600 });
      throttledResize({ width: 810, height: 610 });
      throttledResize({ width: 820, height: 620 });

      expect(handleResize).toHaveBeenCalledTimes(1);
      expect(handleResize).toHaveBeenCalledWith({ width: 800, height: 600 });
    });
  });

  describe("use case: API call throttling", () => {
    it("should prevent excessive API calls", () => {
      const apiCall = vi.fn();
      const throttledApi = throttle(apiCall, 2000);

      // Rapid user actions that trigger API calls
      throttledApi({ query: "test1" });
      throttledApi({ query: "test2" });
      throttledApi({ query: "test3" });

      // Only first call goes through
      expect(apiCall).toHaveBeenCalledTimes(1);
      expect(apiCall).toHaveBeenCalledWith({ query: "test1" });

      // After throttle period, next call allowed
      vi.advanceTimersByTime(2000);
      throttledApi({ query: "test4" });

      expect(apiCall).toHaveBeenCalledTimes(2);
      expect(apiCall).toHaveBeenCalledWith({ query: "test4" });
    });
  });
});
