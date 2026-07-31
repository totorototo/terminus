import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsOnline } from "./useIsOnline.js";

describe("useIsOnline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reflects navigator.onLine as the initial value", () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(false);
  });

  it("returns true when navigator.onLine is true", () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
  });

  it("updates to false when an offline event is dispatched", () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("updates to true when an online event is dispatched", () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });

  it("removes the online and offline listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useIsOnline());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "offline",
      expect.any(Function),
    );
  });
});
