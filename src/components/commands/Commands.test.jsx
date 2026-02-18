import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Commands from "./Commands.jsx";
import useStore from "../../store/store.js";

// Mock the store
vi.mock("../../store/store.js", () => ({
  default: vi.fn(),
}));

// Mock styled icons
vi.mock("@styled-icons/feather/MapPin", () => ({
  MapPin: ({ size, ...props }) => <div data-icon="map-pin" {...props} />,
}));

vi.mock("@styled-icons/feather/Video", () => ({
  Video: ({ size, ...props }) => <div data-icon="video" {...props} />,
}));

vi.mock("@styled-icons/feather/BarChart2", () => ({
  BarChart2: ({ size, ...props }) => <div data-icon="bar-chart" {...props} />,
}));

vi.mock("@styled-icons/feather/Map", () => ({
  Map: ({ size, ...props }) => <div data-icon="map" {...props} />,
}));

vi.mock("@styled-icons/feather/Share2", () => ({
  Share2: ({ size, ...props }) => <div data-icon="share" {...props} />,
}));

// Mock Commands.style
vi.mock("./Commands.style.js", () => ({
  default: (Component) => (props) => <Component {...props} />,
}));

describe("Commands Component", () => {
  let mockToggleProfileMode;
  let mockToggleSlopesMode;
  let mockShareLocation;
  let mockFindClosestLocation;
  let mockSpotMe;

  beforeEach(() => {
    mockToggleProfileMode = vi.fn();
    mockToggleSlopesMode = vi.fn();
    mockShareLocation = vi.fn();
    mockFindClosestLocation = vi.fn();
    mockSpotMe = vi.fn();

    useStore.mockImplementation((selector) =>
      selector({
        app: {
          trackingMode: false,
          profileMode: false,
          displaySlopes: false,
        },
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        spotMe: mockSpotMe,
      }),
    );
  });

  it("should render all command buttons", () => {
    render(<Commands />);

    expect(
      screen.getByLabelText("Find my current location"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle slope colors")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle 2D profile view")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Share my current location"),
    ).toBeInTheDocument();
  });

  it("should call spotMe when location button is clicked", () => {
    render(<Commands />);
    const locationButton = screen.getByLabelText("Find my current location");

    fireEvent.click(locationButton);

    expect(mockSpotMe).toHaveBeenCalledTimes(1);
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
    const shareButton = screen.getByLabelText("Share my current location");

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
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        spotMe: mockSpotMe,
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
    const locationButton = screen.getByLabelText("Find my current location");
    const shareButton = screen.getByLabelText("Share my current location");

    expect(slopesButton).toHaveClass("off");
    // Profile button has inverted logic - when profileMode is false, it shows "on"
    expect(profileButton).toHaveClass("on");
    expect(locationButton).toHaveClass("off");
    expect(shareButton).toHaveClass("off");
  });

  it("should set correct aria-pressed attributes", () => {
    useStore.mockImplementation((selector) =>
      selector({
        app: {
          trackingMode: true,
          profileMode: false,
          displaySlopes: true,
        },
        toggleProfileMode: mockToggleProfileMode,
        toggleSlopesMode: mockToggleSlopesMode,
        shareLocation: mockShareLocation,
        findClosestLocation: mockFindClosestLocation,
        spotMe: mockSpotMe,
      }),
    );

    render(<Commands />);

    const slopesButton = screen.getByLabelText("Toggle slope colors");
    const profileButton = screen.getByLabelText("Toggle 2D profile view");

    expect(slopesButton).toHaveAttribute("aria-pressed", "true");
    expect(profileButton).toHaveAttribute("aria-pressed", "false");
  });
});
