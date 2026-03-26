import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import THEME from "../../theme/Theme.js";
import OffCourseEffect from "./OffCourseEffect.jsx";

import "@testing-library/jest-dom";

const theme = { ...THEME, currentVariant: "dark" };

// ─── R3F mocks ────────────────────────────────────────────────────────────────
// mockScene, mockClock, and frameCallbacks are hoisted so they are available
// inside the vi.mock factory (which is itself hoisted before imports).
const { mockScene, mockClock, frameCallbacks } = vi.hoisted(() => ({
  mockScene: { background: null },
  mockClock: { elapsedTime: 0 },
  frameCallbacks: [],
}));

vi.mock("@react-three/fiber", () => ({
  useThree: () => ({ scene: mockScene, clock: mockClock }),
  // Collect every callback registered by useFrame so tests can invoke them.
  useFrame: vi.fn((cb) => frameCallbacks.push(cb)),
}));

vi.mock("@react-three/drei", () => ({
  Billboard: ({ children, position }) => (
    <div data-testid="billboard" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Text: ({ children }) => <span data-testid="r3f-text">{children}</span>,
}));

// ─── Coordinate transform mock ────────────────────────────────────────────────
vi.mock("../../utils/coordinateTransforms.js", () => ({
  transformCoordinates: () => [[0.5, 0.2, 0.1]],
}));

// ─── Test data ────────────────────────────────────────────────────────────────
const mockProjectedLocation = {
  coords: [[48.8, 2.3, 100]],
  index: 5,
};

const defaultProps = {
  isOffCourse: false,
  deviationDistance: 0,
  projectedLocation: null,
  coordinateScales: {},
};

function renderOCE(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <OffCourseEffect {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

/** Invoke all registered useFrame callbacks at a given clock time. */
function advanceFrame(elapsedTime) {
  mockClock.elapsedTime = elapsedTime;
  frameCallbacks.forEach((cb) => cb());
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("OffCourseEffect", () => {
  beforeAll(() => {
    // Suppress React DOM warnings from R3F primitives rendered in a jsdom context.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockScene.background = null;
    mockClock.elapsedTime = 0;
    frameCallbacks.length = 0;
    vi.clearAllMocks();
  });

  it("sets scene.background to a Color on mount", () => {
    renderOCE();
    expect(mockScene.background).not.toBeNull();
  });

  // ── Label visibility ──────────────────────────────────────────────────────
  describe("off-course label", () => {
    it("is not rendered when isOffCourse is false", () => {
      renderOCE({
        isOffCourse: false,
        deviationDistance: 1500,
        projectedLocation: mockProjectedLocation,
      });
      expect(screen.queryByTestId("billboard")).not.toBeInTheDocument();
    });

    it("is not rendered when deviationDistance is 0", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 0,
        projectedLocation: mockProjectedLocation,
      });
      expect(screen.queryByTestId("billboard")).not.toBeInTheDocument();
    });

    it("is not rendered when projectedLocation is null", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1500,
        projectedLocation: null,
      });
      expect(screen.queryByTestId("billboard")).not.toBeInTheDocument();
    });

    it("is not rendered when projectedLocation has no coords", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1500,
        projectedLocation: { coords: [], index: 0 },
      });
      expect(screen.queryByTestId("billboard")).not.toBeInTheDocument();
    });

    it("is not rendered when coordinateScales is null", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1500,
        projectedLocation: mockProjectedLocation,
        coordinateScales: null,
      });
      expect(screen.queryByTestId("billboard")).not.toBeInTheDocument();
    });

    it("is rendered when all conditions are met", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1500,
        projectedLocation: mockProjectedLocation,
      });
      expect(screen.getByTestId("billboard")).toBeInTheDocument();
    });
  });

  // ── Label text ────────────────────────────────────────────────────────────
  // The formula is Math.round(deviationDistance / 1000).toFixed(1).
  // Math.round fires BEFORE toFixed, so 1499m → 1.0km (not 1.5km).
  // Tests use non-round inputs to document this rounding contract explicitly.
  describe("label text", () => {
    it("rounds 1499m down to 1.0km", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1499,
        projectedLocation: mockProjectedLocation,
      });
      expect(screen.getByTestId("r3f-text")).toHaveTextContent(
        "1.0km off trail",
      );
    });

    it("rounds 1500m up to 2.0km", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1500,
        projectedLocation: mockProjectedLocation,
      });
      expect(screen.getByTestId("r3f-text")).toHaveTextContent(
        "2.0km off trail",
      );
    });

    it("rounds 2700m to 3.0km", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 2700,
        projectedLocation: mockProjectedLocation,
      });
      expect(screen.getByTestId("r3f-text")).toHaveTextContent(
        "3.0km off trail",
      );
    });
  });

  // ── Blink animation (useFrame) ────────────────────────────────────────────
  // The component registers a useFrame callback that drives a timed background
  // blink when isOffCourse goes from false → true (rising edge).
  // We capture the callback via the mock and invoke it manually with controlled
  // clock values to test the animation logic without a real render loop.
  describe("blink animation", () => {
    it("does not change scene.background when isOffCourse stays false", () => {
      renderOCE({ isOffCourse: false });
      const hexBefore = mockScene.background.getHexString();
      advanceFrame(0);
      advanceFrame(1);
      expect(mockScene.background.getHexString()).toBe(hexBefore);
    });

    it("modifies scene.background during blink on rising edge of isOffCourse", () => {
      // prevOffCourse.current starts as false (useRef initial value).
      // Rendering immediately with isOffCourse=true triggers the rising edge
      // on the first frame call.
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1500,
        projectedLocation: mockProjectedLocation,
      });
      const hexNormal = mockScene.background.getHexString();

      // Frame 1 (t=0): rising edge detected, blinkStart set, sin(0)=0 → no visual change yet.
      advanceFrame(0);
      // Frame 2 (t=0.5s): elapsed=0.5s, sin(1.5π)=1, envelope=0.9 → max blink.
      advanceFrame(0.5);

      expect(mockScene.background.getHexString()).not.toBe(hexNormal);
    });

    it("restores scene.background to normal after BLINK_DURATION (5s)", () => {
      renderOCE({
        isOffCourse: true,
        deviationDistance: 1500,
        projectedLocation: mockProjectedLocation,
      });
      const hexNormal = mockScene.background.getHexString();

      advanceFrame(0); // rising edge at t=0
      advanceFrame(0.5); // peak blink
      advanceFrame(5.1); // past BLINK_DURATION → blinkStart reset, normal restored

      expect(mockScene.background.getHexString()).toBe(hexNormal);
    });
  });
});
