import { createElement } from "react";

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRevealOnScroll } from "./useRevealOnScroll.js";

function TestComponent({ threshold }) {
  const [ref, revealed] = useRevealOnScroll(threshold);
  return createElement("div", { ref }, revealed ? "revealed" : "hidden");
}

describe("useRevealOnScroll", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with revealed false when IntersectionObserver is supported", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    const { getByText } = render(createElement(TestComponent));
    expect(getByText("hidden")).toBeTruthy();
  });

  it("becomes revealed once the observed element intersects", () => {
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
    expect(getByText("hidden")).toBeTruthy();

    act(() => {
      observerInstance.callback([{ isIntersecting: true }]);
    });

    expect(getByText("revealed")).toBeTruthy();
  });

  it("disconnects the observer after the first intersection", () => {
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

    render(createElement(TestComponent));
    act(() => {
      observerInstance.callback([{ isIntersecting: true }]);
    });

    expect(observerInstance.disconnect).toHaveBeenCalled();
  });

  it("passes threshold to the IntersectionObserver constructor", () => {
    let capturedOptions;
    class CapturingObserver {
      constructor(_callback, options) {
        capturedOptions = options;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
      }
    }
    vi.stubGlobal("IntersectionObserver", CapturingObserver);

    render(createElement(TestComponent, { threshold: 0.5 }));

    expect(capturedOptions).toEqual({ threshold: 0.5 });
  });

  it("returns revealed true immediately when IntersectionObserver is unsupported", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { getByText } = render(createElement(TestComponent));
    expect(getByText("revealed")).toBeTruthy();
  });
});
