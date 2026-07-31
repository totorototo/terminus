import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { track, trackPageview } from "../lib/analytics.js";
import { usePageTracking } from "./usePageTracking.js";

vi.mock("../lib/analytics.js", () => ({
  track: vi.fn(),
  trackPageview: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

import { useLocation } from "wouter";

describe("usePageTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocation.mockReturnValue(["/some/path"]);
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

  it("tracks the initial pageview on mount", () => {
    renderHook(() => usePageTracking());
    expect(trackPageview).toHaveBeenCalledOnce();
    expect(trackPageview).toHaveBeenCalledWith("/some/path");
  });

  it("tracks a new pageview when the location changes", () => {
    const { rerender } = renderHook(() => usePageTracking());
    expect(trackPageview).toHaveBeenCalledWith("/some/path");

    useLocation.mockReturnValue(["/other/path"]);
    rerender();

    expect(trackPageview).toHaveBeenCalledWith("/other/path");
    expect(trackPageview).toHaveBeenCalledTimes(2);
  });

  it("does not track app-launch again when location changes", () => {
    const { rerender } = renderHook(() => usePageTracking());
    useLocation.mockReturnValue(["/other/path"]);
    rerender();

    expect(track).toHaveBeenCalledOnce();
  });
});
