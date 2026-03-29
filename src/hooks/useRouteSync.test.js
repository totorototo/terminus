import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useStore from "../store/store";
import { useRouteSync } from "./useRouteSync.js";

vi.mock("../store/store", () => ({
  default: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

import { useLocation } from "wouter";

describe("useRouteSync", () => {
  const setCurrentRoute = vi.fn();

  function setupStore(currentRoute) {
    useStore.mockImplementation((selector) =>
      selector({ setCurrentRoute, app: { currentRoute } }),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupStore(null);
    useLocation.mockReturnValue(["/", mockNavigate]);
  });

  describe("route persistence", () => {
    it("calls setCurrentRoute with current location on mount", () => {
      renderHook(() => useRouteSync());
      expect(setCurrentRoute).toHaveBeenCalledWith("/");
    });

    it("calls setCurrentRoute with non-ephemeral location", () => {
      useLocation.mockReturnValue(["/race/ultra", mockNavigate]);
      renderHook(() => useRouteSync());
      expect(setCurrentRoute).toHaveBeenCalledWith("/race/ultra");
    });

    it("calls setCurrentRoute again when location changes", () => {
      const { rerender } = renderHook(() => useRouteSync());
      expect(setCurrentRoute).toHaveBeenCalledWith("/");

      useLocation.mockReturnValue(["/race/ultra", mockNavigate]);
      rerender();

      expect(setCurrentRoute).toHaveBeenCalledWith("/race/ultra");
    });
  });

  describe("route restoration on mount", () => {
    it("restores persisted non-ephemeral route when landing on /", () => {
      setupStore("/race/ultra");
      renderHook(() => useRouteSync());
      expect(mockNavigate).toHaveBeenCalledWith("/race/ultra", {
        replace: true,
      });
    });

    it("does not navigate when persisted route is null", () => {
      setupStore(null);
      renderHook(() => useRouteSync());
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("does not navigate when persisted route is also ephemeral (/)", () => {
      setupStore("/");
      renderHook(() => useRouteSync());
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("does not navigate when current location is not ephemeral", () => {
      setupStore("/race/other");
      useLocation.mockReturnValue(["/race/ultra", mockNavigate]);
      renderHook(() => useRouteSync());
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("restore only fires once on mount, not on subsequent rerenders", () => {
      setupStore("/race/ultra");
      const { rerender } = renderHook(() => useRouteSync());
      expect(mockNavigate).toHaveBeenCalledOnce();

      rerender();

      expect(mockNavigate).toHaveBeenCalledOnce();
    });
  });
});
