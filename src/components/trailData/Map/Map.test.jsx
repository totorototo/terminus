import { forwardRef, useImperativeHandle } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIsOnline } from "../../../hooks/useIsOnline.js";
import * as storeModule from "../../../store/store.js";
import THEME from "../../../theme/Theme.js";
import TrailMap from "./Map.jsx";

import "@testing-library/jest-dom/vitest";

// A short, valid stride-3 [lat, lon, ele] buffer — enough for both the
// online and offline (coordinates-present) render branches.
const ROUTE_LAT_LON_ELE = [45, 6, 100, 45.01, 6.01, 150, 45.02, 6.02, 200];

const { resizeSpy, mapStub } = vi.hoisted(() => {
  const resize = vi.fn();
  return {
    resizeSpy: resize,
    mapStub: {
      resize,
      getContainer: () => document.createElement("div"),
      getSource: () => null,
      setTerrain: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      easeTo: vi.fn(),
    },
  };
});

vi.mock("react-map-gl/mapbox", () => ({
  __esModule: true,
  default: forwardRef(function MockMap(props, ref) {
    useImperativeHandle(ref, () => ({
      fitBounds: vi.fn(),
      getMap: () => mapStub,
    }));
    return <div>{props.children}</div>;
  }),
  Source: ({ children }) => <>{children}</>,
  Layer: ({ id, paint }) => (
    <div data-testid={id} data-color={paint["line-color"]} />
  ),
  Marker: ({ children }) => <>{children}</>,
}));

vi.mock("../../../hooks/useIsOnline.js", () => ({
  useIsOnline: vi.fn(),
}));

vi.mock("../../../store/store.js", () => ({
  default: vi.fn(),
  useProjectedLocation: vi.fn(),
}));

function setup({ isOnline, coords = [] }) {
  useIsOnline.mockReturnValue(isOnline);
  storeModule.default.mockImplementation((selector) =>
    selector({ gpx: { routeLatLonEle: ROUTE_LAT_LON_ELE } }),
  );
  storeModule.useProjectedLocation.mockReturnValue({ coords });
}

function renderMap(variant = "dark") {
  return render(
    <ThemeProvider theme={{ ...THEME, currentVariant: variant }}>
      <TrailMap />
    </ThemeProvider>,
  );
}

describe("TrailMap fullscreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no Fullscreen API, so hasFullscreenApi (evaluated once at
    // module load, before these tests ever ran) is already false — every
    // toggle below exercises the CSS-fallback path deliberately.
  });

  afterEach(() => {
    // RTL auto-unmounts between tests, and the portaled fullscreen node
    // (rendered via createPortal to document.body) is torn down correctly
    // as part of that — React tracks portal children for unmount even
    // though they render outside the local DOM subtree, so no manual DOM
    // cleanup is needed here (and doing it manually races React's own).
    document.body.style.overflow = "";
  });

  it("renders the toggle with the initial 'enter fullscreen' label", () => {
    setup({ isOnline: false });
    renderMap();
    expect(
      screen.getByRole("button", { name: "View map fullscreen" }),
    ).toBeInTheDocument();
  });

  it("falls back to the CSS class and portals the container to document.body, escaping any transformed ancestor", () => {
    setup({ isOnline: false });
    const { container } = renderMap();

    fireEvent.click(
      screen.getByRole("button", { name: "View map fullscreen" }),
    );

    expect(
      screen.getByRole("button", { name: "Exit fullscreen map" }),
    ).toBeInTheDocument();

    const fullscreenEl = document.body.querySelector(".is-fullscreen");
    expect(fullscreenEl).not.toBeNull();
    // Regression guard: this must be portaled to <body> directly, not left
    // nested inside RTL's render container (which is itself just some
    // descendant of body) — a plain in-place position:fixed would silently
    // anchor to a transformed ancestor (StorySection's reveal animation)
    // instead of the viewport. See Map.jsx's renderFullscreenable.
    expect(fullscreenEl.parentElement).toBe(document.body);
    expect(container.querySelector(".is-fullscreen")).toBeNull();
  });

  it("exits fullscreen on Escape", () => {
    setup({ isOnline: false });
    renderMap();

    fireEvent.click(
      screen.getByRole("button", { name: "View map fullscreen" }),
    );
    expect(document.body.querySelector(".is-fullscreen")).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(document.body.querySelector(".is-fullscreen")).toBeNull();
    expect(
      screen.getByRole("button", { name: "View map fullscreen" }),
    ).toBeInTheDocument();
  });

  it("locks body scroll while the fallback is open and restores it on exit", () => {
    setup({ isOnline: false });
    renderMap();

    fireEvent.click(
      screen.getByRole("button", { name: "View map fullscreen" }),
    );
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(
      screen.getByRole("button", { name: "Exit fullscreen map" }),
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("resizes the Mapbox instance when fullscreen is toggled", async () => {
    setup({ isOnline: true });
    renderMap();

    expect(resizeSpy).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "View map fullscreen" }),
    );

    // The resize is scheduled via requestAnimationFrame so the fullscreen
    // CSS transition/layout settles first — jsdom does implement rAF, so no
    // stubbing needed, just wait for the callback to run.
    await waitFor(() => expect(resizeSpy).toHaveBeenCalledTimes(1));
  });
});

describe("TrailMap inks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The outdoors basemap stays light in dark mode, so the map's colours come
  // from THEME.map and must not follow the page theme.
  it.each(["light", "dark"])(
    "draws the route in the map's gold on a white casing in %s mode",
    (variant) => {
      setup({ isOnline: true });
      renderMap(variant);
      expect(screen.getByTestId("route-line")).toHaveAttribute(
        "data-color",
        THEME.map.route,
      );
      expect(screen.getByTestId("route-casing")).toHaveAttribute(
        "data-color",
        THEME.map.casing,
      );
    },
  );

  it.each(["light", "dark"])(
    "draws the offline route and runner in the map's inks in %s mode",
    (variant) => {
      setup({ isOnline: false, coords: [45.01, 6.01, 150] });
      const { container } = renderMap(variant);
      expect(
        container.querySelector(".offline-preview polyline"),
      ).toHaveAttribute("stroke", THEME.map.route);
      expect(
        container.querySelector(".offline-preview circle"),
      ).toHaveAttribute("fill", THEME.map.live);
    },
  );
});
