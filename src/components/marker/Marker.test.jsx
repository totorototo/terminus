import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ThemeProvider } from "styled-components";

import Marker from "./Marker.jsx";
import THEME from "../../theme/Theme.js";

const theme = { ...THEME, currentVariant: "dark" };

// ─── Drei mocks ───────────────────────────────────────────────────────────────
// Expose anchorX as a data attribute so we can assert text alignment.
vi.mock("@react-three/drei", () => ({
  Billboard: ({ children, position }) => (
    <div data-testid="billboard" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Text: ({ children, anchorX }) => (
    <span data-testid="r3f-text" data-anchor-x={anchorX}>
      {children}
    </span>
  ),
  Svg: () => <div data-testid="r3f-svg" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderMarker(props = {}, children = "Trail Start") {
  return render(
    <ThemeProvider theme={theme}>
      <Marker position={[0, 1, 0]} {...props}>
        {children}
      </Marker>
    </ThemeProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Marker", () => {
  // Suppress React warnings about <group> being an unknown DOM element.
  // This is expected: <group> is an R3F primitive rendered in a mocked DOM context.
  beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a Billboard at the given position", () => {
    renderMarker({ position: [1, 2, 3] });
    expect(screen.getByTestId("billboard")).toBeInTheDocument();
    expect(
      JSON.parse(screen.getByTestId("billboard").dataset.position),
    ).toEqual([1, 2, 3]);
  });

  it("renders children inside the Text element", () => {
    renderMarker();
    expect(screen.getByTestId("r3f-text")).toHaveTextContent("Trail Start");
  });

  // ── No icon (unknown / missing wptType) ───────────────────────────────────
  describe("without a wptType icon", () => {
    it("does not render an icon when wptType is undefined", () => {
      renderMarker();
      expect(screen.queryByTestId("r3f-svg")).not.toBeInTheDocument();
    });

    it.each(["Unknown", "", "Summit", null])(
      "does not render an icon for wptType %s",
      (wptType) => {
        renderMarker({ wptType });
        expect(screen.queryByTestId("r3f-svg")).not.toBeInTheDocument();
      },
    );

    it("centers the text when no icon is present", () => {
      renderMarker();
      expect(screen.getByTestId("r3f-text")).toHaveAttribute(
        "data-anchor-x",
        "center",
      );
    });
  });

  // ── Known wptType icons ───────────────────────────────────────────────────
  describe("with a wptType icon", () => {
    it("renders an icon for TimeBarrier", () => {
      renderMarker({ wptType: "TimeBarrier" });
      expect(screen.getByTestId("r3f-svg")).toBeInTheDocument();
    });

    it("renders an icon for LifeBase", () => {
      renderMarker({ wptType: "LifeBase" });
      expect(screen.getByTestId("r3f-svg")).toBeInTheDocument();
    });

    it("left-aligns the text when an icon is present", () => {
      renderMarker({ wptType: "TimeBarrier" });
      expect(screen.getByTestId("r3f-text")).toHaveAttribute(
        "data-anchor-x",
        "left",
      );
    });
  });
});
