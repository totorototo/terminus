import { createElement } from "react";

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useInView } from "./useInView.js";

function TestComponent({ options }) {
  const [ref, inView] = useInView(options);
  return createElement("div", { ref }, inView ? "in-view" : "not-in-view");
}

describe("useInView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with inView false when IntersectionObserver is supported", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    const { getByText } = render(createElement(TestComponent));
    expect(getByText("not-in-view")).toBeTruthy();
  });

  it("becomes true once the observed element intersects", () => {
    let observerInstance;
    class CapturingObserver {
      constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observerInstance = this;
      }
    }
    vi.stubGlobal("IntersectionObserver", CapturingObserver);

    const { getByText } = render(createElement(TestComponent));
    expect(getByText("not-in-view")).toBeTruthy();

    act(() => {
      observerInstance.callback([{ isIntersecting: true }]);
    });

    expect(getByText("in-view")).toBeTruthy();
  });

  it("disconnects the observer after the first intersection when once=true", () => {
    let observerInstance;
    class CapturingObserver {
      constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observerInstance = this;
      }
    }
    vi.stubGlobal("IntersectionObserver", CapturingObserver);

    render(createElement(TestComponent, { options: { once: true } }));
    act(() => {
      observerInstance.callback([{ isIntersecting: true }]);
    });

    expect(observerInstance.disconnect).toHaveBeenCalled();
  });

  it("does not disconnect after intersection when once=false", () => {
    let observerInstance;
    class CapturingObserver {
      constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observerInstance = this;
      }
    }
    vi.stubGlobal("IntersectionObserver", CapturingObserver);

    render(createElement(TestComponent, { options: { once: false } }));
    act(() => {
      observerInstance.callback([{ isIntersecting: true }]);
    });

    expect(observerInstance.disconnect).not.toHaveBeenCalled();
  });

  it("passes rootMargin to the IntersectionObserver constructor", () => {
    let capturedOptions;
    class CapturingObserver {
      constructor(_callback, options) {
        capturedOptions = options;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
      }
    }
    vi.stubGlobal("IntersectionObserver", CapturingObserver);

    render(createElement(TestComponent, { options: { rootMargin: "50px" } }));

    expect(capturedOptions).toEqual({ rootMargin: "50px" });
  });

  it("returns inView true immediately when IntersectionObserver is unsupported", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { getByText } = render(createElement(TestComponent));
    expect(getByText("in-view")).toBeTruthy();
  });
});
