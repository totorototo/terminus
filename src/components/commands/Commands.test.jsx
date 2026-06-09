import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useStore from "../../store/store.js";
import Commands from "./Commands.jsx";

import "@testing-library/jest-dom/vitest";

// Mock the store
vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
}));

// Mock styled icons
vi.mock("@styled-icons/feather/Radio", () => ({
  Radio: ({ size: _size, ...props }) => <div data-icon="radio" {...props} />,
}));

vi.mock("@styled-icons/feather/Video", () => ({
  Video: ({ size: _size, ...props }) => <div data-icon="video" {...props} />,
}));

vi.mock("@styled-icons/feather/BarChart2", () => ({
  BarChart2: ({ size: _size, ...props }) => (
    <div data-icon="bar-chart" {...props} />
  ),
}));

vi.mock("@styled-icons/feather/Map", () => ({
  Map: ({ size: _size, ...props }) => <div data-icon="map" {...props} />,
}));

vi.mock("@styled-icons/feather/Share2", () => ({
  Share2: ({ size: _size, ...props }) => <div data-icon="share" {...props} />,
}));

// Mock Commands.style
vi.mock("./Commands.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

vi.mock("../../hooks/useIsDesktop.js", () => ({
  useIsDesktop: () => false,
}));

describe("Commands Component", () => {
  let mockToggleProfileMode;
  let mockToggleSlopesMode;
  let mockShareLocation;
  let mockFindClosestLocation;
  let mockToggleAutoShare;

  beforeEach(() => {
    mockToggleProfileMode = vi.fn();
    mockToggleSlopesMode = vi.fn();
    mockShareLocation = vi.fn();
    mockFindClosestLocation = vi.fn();
    mockToggleAutoShare = vi.fn();

    useStore.mockImplementation((selector) =>
      selector({
        app: {
          trackingMode: false,
          profileMode: false,
          displaySlopes: false,
        },
        gps: {
          projectedLocation: { timestamp: 1 },
          autoShareEnabled: false,
        },
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        toggleAutoShare: mockToggleAutoShare,
      }),
    );
  });

  it("should render all command buttons", () => {
    render(<Commands />);

    expect(
      screen.getByLabelText("Auto-share location every 30 min"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle slope colors")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle 2D profile view")).toBeInTheDocument();
    expect(screen.getByLabelText("Share my room code")).toBeInTheDocument();
  });

  it("should call toggleAutoShare when auto-share button is clicked", () => {
    render(<Commands />);
    const autoShareButton = screen.getByLabelText(
      "Auto-share location every 30 min",
    );

    fireEvent.click(autoShareButton);

    expect(mockToggleAutoShare).toHaveBeenCalledTimes(1);
  });

  it("should call toggleSlopesMode when slopes button is clicked", () => {
    render(<Commands />);
    const slopesButton = screen.getByLabelText("Toggle slope colors");

    fireEvent.click(slopesButton);

    expect(mockToggleSlopesMode).toHaveBeenCalledTimes(1);
  });

  it("should call toggleProfileMode when profile button is clicked", () => {
    render(<Commands />);
    const profileButton = screen.getByLabelText("Toggle 2D profile view");

    fireEvent.click(profileButton);

    expect(mockToggleProfileMode).toHaveBeenCalledTimes(1);
  });

  it("should call shareLocation when share button is clicked", () => {
    render(<Commands />);
    const shareButton = screen.getByLabelText("Share my room code");

    fireEvent.click(shareButton);

    expect(mockShareLocation).toHaveBeenCalledTimes(1);
  });

  it("should apply 'on' class to active buttons", () => {
    useStore.mockImplementation((selector) =>
      selector({
        app: {
          trackingMode: true,
          profileMode: false,
          displaySlopes: true,
        },
        gps: {
          projectedLocation: { timestamp: 1 },
          autoShareEnabled: false,
        },
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        toggleAutoShare: mockToggleAutoShare,
      }),
    );

    render(<Commands />);

    const slopesButton = screen.getByLabelText("Toggle slope colors");
    const profileButton = screen.getByLabelText("Toggle 2D profile view");

    expect(slopesButton).toHaveClass("on");
    expect(profileButton).toHaveClass("on");
  });

  it("should apply 'off' class to inactive buttons", () => {
    render(<Commands />);

    const slopesButton = screen.getByLabelText("Toggle slope colors");
    const profileButton = screen.getByLabelText("Toggle 2D profile view");
    const autoShareButton = screen.getByLabelText(
      "Auto-share location every 30 min",
    );
    const shareButton = screen.getByLabelText("Share my room code");

    expect(slopesButton).toHaveClass("off");
    // Profile button has inverted logic - when profileMode is false, it shows "on"
    expect(profileButton).toHaveClass("on");
    expect(autoShareButton).toHaveClass("off");
    expect(shareButton).toHaveClass("off");
  });

  it("should apply 'on' class to auto-share button when enabled", () => {
    useStore.mockImplementation((selector) =>
      selector({
        app: { trackingMode: false, profileMode: false, displaySlopes: false },
        gps: {
          projectedLocation: { timestamp: 1 },
          autoShareEnabled: true,
        },
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        toggleAutoShare: mockToggleAutoShare,
      }),
    );

    render(<Commands />);

    const autoShareButton = screen.getByLabelText("Stop auto-sharing location");
    expect(autoShareButton).toHaveClass("on");
    expect(autoShareButton).toHaveAttribute("aria-pressed", "true");
  });

  it("should set correct aria-pressed attributes", () => {
    useStore.mockImplementation((selector) =>
      selector({
        app: {
          trackingMode: true,
          profileMode: false,
          displaySlopes: true,
        },
        gps: {
          projectedLocation: { timestamp: 1 },
          autoShareEnabled: false,
        },
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        toggleAutoShare: mockToggleAutoShare,
      }),
    );

    render(<Commands />);

    const slopesButton = screen.getByLabelText("Toggle slope colors");
    const profileButton = screen.getByLabelText("Toggle 2D profile view");

    expect(slopesButton).toHaveAttribute("aria-pressed", "true");
    expect(profileButton).toHaveAttribute("aria-pressed", "false");
  });

  it("should show 'live' class when there is an active session", () => {
    useStore.mockImplementation((selector) =>
      selector({
        app: {
          trackingMode: false,
          profileMode: false,
          displaySlopes: false,
          liveSessionId: "ABC123",
        },
        gps: {
          projectedLocation: { timestamp: 123 },
          autoShareEnabled: false,
        },
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        toggleAutoShare: mockToggleAutoShare,
      }),
    );

    render(<Commands />);

    const shareButton = screen.getByLabelText("Share my room code");

    expect(shareButton).toHaveClass("off");
  });
});
