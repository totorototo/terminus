import { describe, expect, it, vi } from "vitest";

import { showToast, subscribeToToasts } from "./toast.js";

describe("toast helper", () => {
  it("notifies subscribed listeners with the message and default type", () => {
    const listener = vi.fn();
    subscribeToToasts(listener);

    showToast("Hello");

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Hello", type: "info" }),
    );
  });

  it("passes through a custom type", () => {
    const listener = vi.fn();
    subscribeToToasts(listener);

    showToast("Uh oh", { type: "error" });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Uh oh", type: "error" }),
    );
  });

  it("assigns a unique id to each toast", () => {
    const listener = vi.fn();
    subscribeToToasts(listener);

    showToast("First");
    showToast("Second");

    const [firstToast] = listener.mock.calls[0];
    const [secondToast] = listener.mock.calls[1];
    expect(firstToast.id).not.toBe(secondToast.id);
  });

  it("notifies every subscribed listener", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    subscribeToToasts(listenerA);
    subscribeToToasts(listenerB);

    showToast("Broadcast");

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it("stops notifying a listener once unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    unsubscribe();

    showToast("After unsubscribe");

    expect(listener).not.toHaveBeenCalled();
  });
});
