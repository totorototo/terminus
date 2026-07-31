import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it, vi } from "vitest";

import THEME from "../../theme/Theme.js";
import LandscapeOverlay from "./LandscapeOverlay.jsx";

import "@testing-library/jest-dom/vitest";

function mockMatchMedia(initialMatches) {
  const listeners = [];
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: initialMatches,
    addEventListener: (event, handler) => listeners.push(handler),
    removeEventListener: vi.fn(),
  });
  return {
    fireChange: (matches) =>
      act(() => listeners.forEach((handler) => handler({ matches }))),
  };
}

function renderWithTheme() {
  return render(
    <ThemeProvider theme={{ ...THEME, currentVariant: "dark" }}>
      <LandscapeOverlay />
    </ThemeProvider>,
  );
}

describe("LandscapeOverlay", () => {
  it("renders null in portrait", () => {
    mockMatchMedia(false);
    const { container } = renderWithTheme();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the overlay in landscape", () => {
    mockMatchMedia(true);
    renderWithTheme();
    expect(
      screen.getByText("Please rotate your device to portrait mode"),
    ).toBeInTheDocument();
  });

  it("dismisses the overlay when 'Continue in landscape' is clicked", () => {
    mockMatchMedia(true);
    const { container } = renderWithTheme();
    fireEvent.click(screen.getByText("Continue in landscape"));
    expect(container).toBeEmptyDOMElement();
  });

  it("re-arms the overlay after returning to portrait then landscape again", () => {
    const { fireChange } = mockMatchMedia(true);
    const { container } = renderWithTheme();

    fireEvent.click(screen.getByText("Continue in landscape"));
    expect(container).toBeEmptyDOMElement();

    fireChange(false);
    expect(container).toBeEmptyDOMElement();

    fireChange(true);
    expect(
      screen.getByText("Please rotate your device to portrait mode"),
    ).toBeInTheDocument();
  });
});
