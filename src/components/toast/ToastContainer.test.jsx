import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToToasts } from "../../helpers/toast.js";
import ToastContainer from "./ToastContainer.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("../../helpers/toast.js", () => ({
  subscribeToToasts: vi.fn(),
}));

vi.mock("./ToastContainer.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("ToastContainer", () => {
  let capturedListener;

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeToToasts.mockImplementation((listener) => {
      capturedListener = listener;
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when no toasts have fired", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a toast after the subscribed listener is called", () => {
    render(<ToastContainer />);
    act(() => {
      capturedListener({ id: 1, message: "Hi", type: "success" });
    });
    const toastElement = screen.getByText("Hi");
    expect(toastElement).toHaveClass("toast", "toast-success");
  });

  it("auto-dismisses a toast after TOAST_DURATION_MS", () => {
    vi.useFakeTimers();
    render(<ToastContainer />);
    act(() => {
      capturedListener({ id: 1, message: "Hi", type: "success" });
    });
    expect(screen.getByText("Hi")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Hi")).not.toBeInTheDocument();
  });
});
