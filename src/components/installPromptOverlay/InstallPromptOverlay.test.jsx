import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { afterEach, describe, expect, it, vi } from "vitest";

import THEME from "../../theme/Theme.js";

import "@testing-library/jest-dom/vitest";

function mockMatchMedia(matches) {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function setNavigatorStandalone(value) {
  if (value === undefined) delete window.navigator.standalone;
  else
    Object.defineProperty(window.navigator, "standalone", {
      value,
      configurable: true,
    });
}

// isInstalled/isMobile/isIOS are evaluated once at module-load time, so each
// scenario needs a fresh module instance loaded after the globals are mocked.
async function loadOverlay({
  isMobile = true,
  isInstalled = false,
  standalone,
  dismissed = false,
  dismiss = vi.fn(),
} = {}) {
  vi.resetModules();
  mockMatchMedia({
    "(hover: none) and (pointer: coarse)": isMobile,
    "(display-mode: standalone)": isInstalled,
  });
  setNavigatorStandalone(standalone);

  vi.doMock("../../store/store.js", () => ({
    default: (selector) =>
      selector({
        app: { installPromptDismissed: dismissed },
        dismissInstallPrompt: dismiss,
      }),
  }));

  const { default: InstallPromptOverlay } =
    await import("./InstallPromptOverlay.jsx");
  return InstallPromptOverlay;
}

function renderWithTheme(InstallPromptOverlay) {
  return render(
    <ThemeProvider theme={{ ...THEME, currentVariant: "dark" }}>
      <InstallPromptOverlay />
    </ThemeProvider>,
  );
}

describe("InstallPromptOverlay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock("../../store/store.js");
    setNavigatorStandalone(undefined);
  });

  it("renders null when not on a mobile device", async () => {
    const InstallPromptOverlay = await loadOverlay({ isMobile: false });
    const { container } = renderWithTheme(InstallPromptOverlay);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders null when already installed", async () => {
    const InstallPromptOverlay = await loadOverlay({ isInstalled: true });
    const { container } = renderWithTheme(InstallPromptOverlay);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders null when dismissed", async () => {
    const InstallPromptOverlay = await loadOverlay({ dismissed: true });
    const { container } = renderWithTheme(InstallPromptOverlay);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders iOS instructions when 'standalone' exists on navigator", async () => {
    const InstallPromptOverlay = await loadOverlay({ standalone: false });
    renderWithTheme(InstallPromptOverlay);
    expect(screen.getByText(/Share button/)).toBeInTheDocument();
  });

  it("renders non-iOS instructions when 'standalone' is absent from navigator", async () => {
    const InstallPromptOverlay = await loadOverlay({ standalone: undefined });
    renderWithTheme(InstallPromptOverlay);
    expect(screen.getByText(/browser menu/)).toBeInTheDocument();
  });

  it("calls dismissInstallPrompt when 'Not now' is clicked", async () => {
    const dismiss = vi.fn();
    const InstallPromptOverlay = await loadOverlay({ dismiss });
    renderWithTheme(InstallPromptOverlay);
    fireEvent.click(screen.getByText("Not now"));
    expect(dismiss).toHaveBeenCalled();
  });
});
