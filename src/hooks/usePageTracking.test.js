import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { track } from "../lib/analytics.js";
import { usePageTracking } from "./usePageTracking.js";

vi.mock("../lib/analytics.js", () => ({
  track: vi.fn(),
}));

describe("usePageTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks app-launch once on mount with displayMode 'browser'", () => {
    renderHook(() => usePageTracking());
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith("app-launch", {
      displayMode: "browser",
    });
  });

  it("tracks app-launch with displayMode 'standalone' when matchMedia matches", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true });
    renderHook(() => usePageTracking());
    expect(track).toHaveBeenCalledWith("app-launch", {
      displayMode: "standalone",
    });
  });

  it("does not track app-launch again on rerender", () => {
    const { rerender } = renderHook(() => usePageTracking());
    rerender();

    expect(track).toHaveBeenCalledOnce();
  });
});
