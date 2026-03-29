import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useIsDesktop } from "./useIsDesktop.js";

vi.mock("@uidotdev/usehooks", () => ({
  useMediaQuery: vi.fn(),
}));

import { useMediaQuery } from "@uidotdev/usehooks";

describe("useIsDesktop", () => {
  it("passes the correct 993px breakpoint query", () => {
    useMediaQuery.mockReturnValue(false);
    renderHook(() => useIsDesktop());
    expect(useMediaQuery).toHaveBeenCalledWith(
      "only screen and (min-width: 993px)",
    );
  });

  it("returns true when screen is at or above the breakpoint", () => {
    useMediaQuery.mockReturnValue(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it("returns false when screen is below the breakpoint", () => {
    useMediaQuery.mockReturnValue(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});
