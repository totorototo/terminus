import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "wouter";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import TrailerScreen from "./TrailerScreen.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn) => fn,
}));

vi.mock("../../hooks/useGPXWorker.js", () => ({
  useGPXWorker: vi.fn(),
}));

vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
}));

vi.mock("../story/Story.jsx", () => ({
  default: () => <div data-testid="story" />,
}));

vi.mock("../loadingSpinner/LoadingSpinner.jsx", () => ({
  default: () => <div data-testid="loading-spinner" />,
}));

vi.mock("../story/ThemeToggle.jsx", () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

vi.mock("./TrailerScreen.style", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("TrailerScreen", () => {
  const disconnectTrailerSession = vi.fn();
  const setMode = vi.fn();
  const resumeAutoShare = vi.fn();
  const navigate = vi.fn();

  function setupStore(autoShareEnabled) {
    useStore.mockImplementation((selector) =>
      selector({
        disconnectTrailerSession,
        setMode,
        resumeAutoShare,
      }),
    );
    useStore.getState = vi.fn().mockReturnValue({
      gps: { autoShareEnabled },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupStore(false);
    useGPXWorker.mockReturnValue({ isWorkerReady: false });
    useLocation.mockReturnValue(["/run", navigate]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls setMode('trailer') on mount", () => {
    render(<TrailerScreen />);
    expect(setMode).toHaveBeenCalledWith("trailer");
  });

  it("calls setMode(null) and disconnectTrailerSession on unmount", () => {
    const { unmount } = render(<TrailerScreen />);
    unmount();
    expect(disconnectTrailerSession).toHaveBeenCalledOnce();
    expect(setMode).toHaveBeenCalledWith(null);
  });

  it("sends the runner back to the wizard when no GPX is stored", () => {
    useGPXWorker.mockReturnValue({ isWorkerReady: true, missing: true });
    render(<TrailerScreen />);
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("stays on /run while a GPX is stored", () => {
    useGPXWorker.mockReturnValue({ isWorkerReady: true, missing: false });
    render(<TrailerScreen />);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("calls resumeAutoShare once the worker is ready if autoShareEnabled was true at mount", () => {
    setupStore(true);
    useGPXWorker.mockReturnValue({ isWorkerReady: false });
    const { rerender } = render(<TrailerScreen />);
    expect(resumeAutoShare).not.toHaveBeenCalled();

    useGPXWorker.mockReturnValue({ isWorkerReady: true });
    rerender(<TrailerScreen />);

    expect(resumeAutoShare).toHaveBeenCalledOnce();
  });

  it("does not call resumeAutoShare if autoShareEnabled was false at mount", () => {
    setupStore(false);
    useGPXWorker.mockReturnValue({ isWorkerReady: false });
    const { rerender } = render(<TrailerScreen />);

    useGPXWorker.mockReturnValue({ isWorkerReady: true });
    rerender(<TrailerScreen />);

    expect(resumeAutoShare).not.toHaveBeenCalled();
  });

  it("renders LoadingSpinner when isWorkerReady is false", () => {
    const { getByTestId, queryByTestId } = render(<TrailerScreen />);
    expect(getByTestId("loading-spinner")).toBeInTheDocument();
    expect(queryByTestId("story")).not.toBeInTheDocument();
  });

  it("renders Story when isWorkerReady is true", () => {
    useGPXWorker.mockReturnValue({ isWorkerReady: true });
    const { getByTestId, queryByTestId } = render(<TrailerScreen />);
    expect(getByTestId("story")).toBeInTheDocument();
    expect(queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });
});
