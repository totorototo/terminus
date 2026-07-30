import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCollapsibleList } from "./useCollapsibleList.js";

describe("useCollapsibleList", () => {
  it("caps to the threshold by default when nothing is active", () => {
    const { result } = renderHook(() =>
      useCollapsibleList(20, { threshold: 5 }),
    );
    expect(result.current.visibleCount).toBe(5);
    expect(result.current.hiddenCount).toBe(15);
  });

  it("does not cap below the list length", () => {
    const { result } = renderHook(() =>
      useCollapsibleList(3, { threshold: 5 }),
    );
    expect(result.current.visibleCount).toBe(3);
    expect(result.current.hiddenCount).toBe(0);
  });

  it("extends past the threshold to keep the active row visible", () => {
    const { result } = renderHook(() =>
      useCollapsibleList(20, { threshold: 5, activeIndex: 11 }),
    );
    expect(result.current.visibleCount).toBe(12);
    expect(result.current.hiddenCount).toBe(8);
  });

  it("expand() reveals the full list", () => {
    const { result } = renderHook(() =>
      useCollapsibleList(20, { threshold: 5 }),
    );
    act(() => result.current.expand());
    expect(result.current.visibleCount).toBe(20);
    expect(result.current.hiddenCount).toBe(0);
    expect(result.current.expanded).toBe(true);
  });
});
