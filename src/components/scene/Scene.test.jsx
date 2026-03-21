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

import StyledScene from "./Scene.jsx";
import useStore from "../../store/store.js";
import THEME from "../../theme/Theme.js";

const theme = { ...THEME, currentVariant: "dark" };

// ─── Store mock ───────────────────────────────────────────────────────────────
// Auto-mock so we can call .mockImplementation() per test
vi.mock("../../store/store.js");

// ─── @react-three/fiber ───────────────────────────────────────────────────────
// Canvas is mocked as a plain div that renders its children.
// The onCreated callback is invoked synchronously so the aria-label is applied.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, className, style, onCreated }) => {
    if (onCreated) {
      onCreated({ gl: { domElement: document.createElement("canvas") } });
    }
    return (
      <div data-testid="canvas-root" className={className} style={style}>
        {children}
      </div>
    );
  },
}));

// ─── Utility mocks ────────────────────────────────────────────────────────────
vi.mock("../../utils/coordinateTransforms.js", () => ({
  createCoordinateScales: vi.fn(() => ({})),
}));

// ─── Child component mocks ────────────────────────────────────────────────────
// Heavy R3F components are replaced with lightweight sentinels so tests focus
// on Scene's own conditional-rendering logic.

vi.mock("../cameraController/CameraController.jsx", () => ({
  default: () => null,
}));

vi.mock("../enhancedProfile/EnhancedProfile.jsx", () => ({
  default: () => null,
}));

vi.mock("../peaks/Peaks.jsx", () => ({
  default: () => null,
}));

vi.mock("../marker/Marker.jsx", () => ({
  default: ({ children }) => <div data-testid="marker">{children}</div>,
}));

vi.mock("../offCourseEffect/OffCourseEffect.jsx", () => ({
  default: ({ isOffCourse, deviationDistance }) => (
    <div
      data-testid="off-course-effect"
      data-is-off-course={String(isOffCourse)}
      data-deviation={deviationDistance}
    />
  ),
}));

vi.mock("../trailer/Trailer.jsx", () => ({
  Trailer: () => <div data-testid="trailer" />,
}));

vi.mock("../flyBy/FlyBy", () => ({
  default: () => <div data-testid="fly-by" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const defaultState = {
  app: { profileMode: false, trackingMode: false },
  gpx: { data: [], metadata: { name: null } },
  gps: {
    projectedLocation: { timestamp: 0 },
    isOffCourse: false,
    deviationDistance: 0,
  },
};

function renderScene(state = defaultState, props = {}) {
  useStore.mockImplementation((selector) => selector(state));
  return render(
    <ThemeProvider theme={theme}>
      <StyledScene width={800} height={600} {...props} />
    </ThemeProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Scene", () => {
  // SceneLights uses R3F primitives (ambientLight, spotLight, pointLight).
  // When Canvas is mocked as a div, React treats them as unknown DOM elements
  // and emits console.error warnings.  Suppress suite-wide to keep output clean.
  beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the R3F canvas container", () => {
    renderScene();
    expect(screen.getByTestId("canvas-root")).toBeInTheDocument();
  });

  it("passes profileMode to createCoordinateScales", async () => {
    const { createCoordinateScales } =
      await import("../../utils/coordinateTransforms.js");
    const state = {
      ...defaultState,
      app: { ...defaultState.app, profileMode: true },
    };
    renderScene(state);
    expect(createCoordinateScales).toHaveBeenCalledWith(expect.anything(), {
      profileMode: true,
    });
  });

  it("sets width and height on the canvas container", () => {
    renderScene(defaultState, { width: 1024, height: 768 });
    const canvas = screen.getByTestId("canvas-root");
    expect(canvas).toHaveStyle({ width: "1024px", height: "768px" });
  });

  // ── Marker ────────────────────────────────────────────────────────────────
  describe("Marker", () => {
    it("is not rendered when name is null", () => {
      renderScene();
      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });

    it("is rendered when a trail name exists in the store", () => {
      const state = {
        ...defaultState,
        gpx: { ...defaultState.gpx, metadata: { name: "Mont Blanc Tour" } },
      };
      renderScene(state);
      expect(screen.getByTestId("marker")).toBeInTheDocument();
    });

    it("displays the trail name as its content", () => {
      const state = {
        ...defaultState,
        gpx: { ...defaultState.gpx, metadata: { name: "Mont Blanc Tour" } },
      };
      renderScene(state);
      expect(screen.getByTestId("marker")).toHaveTextContent("Mont Blanc Tour");
    });
  });

  // ── FlyBy ─────────────────────────────────────────────────────────────────
  describe("FlyBy", () => {
    it("is not rendered when trackingMode is false", () => {
      renderScene();
      expect(screen.queryByTestId("fly-by")).not.toBeInTheDocument();
    });

    it("is rendered when trackingMode is true", () => {
      const state = {
        ...defaultState,
        app: { ...defaultState.app, trackingMode: true },
      };
      renderScene(state);
      expect(screen.getByTestId("fly-by")).toBeInTheDocument();
    });
  });

  // ── Trailer ───────────────────────────────────────────────────────────────
  describe("Trailer", () => {
    it("is not rendered when projectedLocation is null", () => {
      const state = {
        ...defaultState,
        gps: { ...defaultState.gps, projectedLocation: null },
      };
      renderScene(state);
      expect(screen.queryByTestId("trailer")).not.toBeInTheDocument();
    });

    it("is not rendered when projectedLocation.timestamp is 0", () => {
      renderScene();
      expect(screen.queryByTestId("trailer")).not.toBeInTheDocument();
    });

    it("is rendered when projectedLocation has a non-zero timestamp", () => {
      const state = {
        ...defaultState,
        gps: {
          ...defaultState.gps,
          projectedLocation: { timestamp: 1747123456789 },
        },
      };
      renderScene(state);
      expect(screen.getByTestId("trailer")).toBeInTheDocument();
    });
  });

  // ── OffCourseEffect ───────────────────────────────────────────────────────
  describe("OffCourseEffect", () => {
    it("is always rendered", () => {
      renderScene();
      expect(screen.getByTestId("off-course-effect")).toBeInTheDocument();
    });

    it("receives isOffCourse=false by default", () => {
      renderScene();
      expect(screen.getByTestId("off-course-effect")).toHaveAttribute(
        "data-is-off-course",
        "false",
      );
    });

    it("receives isOffCourse=true when the store signals off-course", () => {
      const state = {
        ...defaultState,
        gps: { ...defaultState.gps, isOffCourse: true },
      };
      renderScene(state);
      expect(screen.getByTestId("off-course-effect")).toHaveAttribute(
        "data-is-off-course",
        "true",
      );
    });

    it("forwards deviationDistance from the store", () => {
      const state = {
        ...defaultState,
        gps: { ...defaultState.gps, deviationDistance: 42 },
      };
      renderScene(state);
      expect(screen.getByTestId("off-course-effect")).toHaveAttribute(
        "data-deviation",
        "42",
      );
    });
  });
});
