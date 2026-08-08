import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useParams } from "wouter";

import { useGPXWorker } from "../../hooks/useGPXWorker.js";
import useStore from "../../store/store.js";
import FollowerScreen from "./FollowerScreen.jsx";

import "@testing-library/jest-dom/vitest";

vi.mock("wouter", () => ({
  useParams: vi.fn(),
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

vi.mock("../story/StoryDotNav.jsx", () => ({
  default: () => <div data-testid="story-dot-nav" />,
}));

vi.mock("./FollowerScreen.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("FollowerScreen", () => {
  const connectToFollowerSession = vi.fn();
  const disconnectFollowerSession = vi.fn();
  const setRaceId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.mockImplementation((selector) =>
      selector({
        connectToFollowerSession,
        disconnectFollowerSession,
        setRaceId,
      }),
    );
    useGPXWorker.mockReturnValue({ isWorkerReady: false });
    useParams.mockReturnValue({ roomId: undefined, raceId: undefined });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls setRaceId with raceId when present", () => {
    useParams.mockReturnValue({ roomId: undefined, raceId: "race1" });
    render(<FollowerScreen />);
    expect(setRaceId).toHaveBeenCalledWith("race1");
  });

  it("does not call setRaceId when raceId is absent", () => {
    render(<FollowerScreen />);
    expect(setRaceId).not.toHaveBeenCalled();
  });

  it("calls connectToFollowerSession with roomId on mount", () => {
    useParams.mockReturnValue({ roomId: "room1", raceId: "race1" });
    render(<FollowerScreen />);
    expect(connectToFollowerSession).toHaveBeenCalledWith("room1");
  });

  it("does not call connectToFollowerSession when roomId is absent", () => {
    render(<FollowerScreen />);
    expect(connectToFollowerSession).not.toHaveBeenCalled();
  });

  it("calls disconnectFollowerSession on unmount", () => {
    useParams.mockReturnValue({ roomId: "room1", raceId: "race1" });
    const { unmount } = render(<FollowerScreen />);
    unmount();
    expect(disconnectFollowerSession).toHaveBeenCalledOnce();
  });

  it("renders LoadingSpinner when isWorkerReady is false", () => {
    useGPXWorker.mockReturnValue({ isWorkerReady: false });
    const { getByTestId, queryByTestId } = render(<FollowerScreen />);
    expect(getByTestId("loading-spinner")).toBeInTheDocument();
    expect(queryByTestId("story")).not.toBeInTheDocument();
  });

  it("renders Story when isWorkerReady is true", () => {
    useGPXWorker.mockReturnValue({ isWorkerReady: true });
    const { getByTestId, queryByTestId } = render(<FollowerScreen />);
    expect(getByTestId("story")).toBeInTheDocument();
    expect(queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });
});
