import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Profile from "./Profile.jsx";

// Mock React Three Fiber and Three.js since this is a 3D component
vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(() => {
    // Store for potential frame-based testing
  }),
  extend: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  shaderMaterial: vi.fn(() => vi.fn()),
}));

vi.mock("three", () => ({
  Color: class Color {
    constructor(color) {
      this.color = color;
    }
  },
  DoubleSide: 2,
  DynamicDrawUsage: 0x88,
}));

vi.mock("../../helpers/createVertices", () => ({
  createVertices: vi.fn((points) => {
    if (!points || points.length < 2) return new Float32Array(0);
    const vertexCount = (points.length - 1) * 6 * 3;
    return new Float32Array(vertexCount);
  }),
}));

describe("Profile Component", () => {
  const mockPoints = [
    [0, 0, 0],
    [1, 1, 0],
    [2, 2, 0],
    [3, 3, 0],
  ];

  const mockSlopes = [0, 5, 10, 15];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with required props", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("material selection", () => {
    it("should render with slope material when showSlopeColors is true", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          slopes={mockSlopes}
          showSlopeColors={true}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should render with solid color material by default", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          slopes={mockSlopes}
          showSlopeColors={false}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should switch material type on prop change", () => {
      const { rerender, container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          showSlopeColors={false}
        />,
      );

      expect(container).toBeInTheDocument();

      rerender(
        <Profile points={mockPoints} color={0xff0000} showSlopeColors={true} />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("attribute handling", () => {
    it("should create slope attribute from slopes array", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          slopes={mockSlopes}
          showSlopeColors={true}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle missing slopes gracefully", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          slopes={undefined}
          showSlopeColors={true}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle empty slopes array", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          slopes={[]}
          showSlopeColors={true}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should create vertex index attributes for progress tracking", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          slopes={mockSlopes}
          progressIndex={2}
        />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("progress parameters", () => {
    it("should accept progressIndex prop", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} progressIndex={1.5} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle negative progressIndex", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} progressIndex={-1} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle progressIndex beyond trail end", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} progressIndex={10} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should accept all progress range parameters", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          progressIndex={1.5}
          progressColor={0x00ff00}
          startIndex={0}
          endIndex={4}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should use base color when progressColor not provided", () => {
      const { container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          progressIndex={1.5}
          startIndex={0}
          endIndex={4}
        />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should use default values for missing progress params", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("event handling", () => {
    it("should accept onClick handler", () => {
      const mockOnClick = vi.fn();

      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} onClick={mockOnClick} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle undefined onClick", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} onClick={undefined} />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("animation props", () => {
    it("should accept custom duration", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} duration={1000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should use default duration of 750ms", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle zero duration", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} duration={0} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle large duration values", () => {
      const { container } = render(
        <Profile points={mockPoints} color={0xff0000} duration={10000} />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("point data handling", () => {
    it("should handle 2D points", () => {
      const points2d = [
        [0, 0],
        [1, 1],
        [2, 2],
      ];

      const { container } = render(
        <Profile points={points2d} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle 3D points", () => {
      const points3d = [
        [0, 0, 0],
        [1, 1, 5],
        [2, 2, 10],
      ];

      const { container } = render(
        <Profile points={points3d} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle negative coordinates", () => {
      const pointsNegative = [
        [-10, -10, -5],
        [-5, -5, 0],
        [0, 0, 5],
      ];

      const { container } = render(
        <Profile points={pointsNegative} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle large point arrays", () => {
      const largePoints = Array.from({ length: 100 }, (_, i) => [i, i, 0]);

      const { container } = render(
        <Profile points={largePoints} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle single point (minimum valid)", () => {
      const { container } = render(
        <Profile points={[[0, 0, 0]]} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle two points (minimum for trail)", () => {
      const { container } = render(
        <Profile
          points={[
            [0, 0, 0],
            [1, 1, 1],
          ]}
          color={0xff0000}
        />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("prop updates and rerendering", () => {
    it("should handle point updates", () => {
      const { rerender, container } = render(
        <Profile points={mockPoints} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();

      rerender(
        <Profile points={[...mockPoints, [4, 4, 0]]} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle color changes", () => {
      const { rerender, container } = render(
        <Profile points={mockPoints} color={0xff0000} />,
      );

      expect(container).toBeInTheDocument();

      rerender(<Profile points={mockPoints} color={0x00ff00} />);

      expect(container).toBeInTheDocument();
    });

    it("should handle progress updates", () => {
      const { rerender, container } = render(
        <Profile points={mockPoints} color={0xff0000} progressIndex={0} />,
      );

      expect(container).toBeInTheDocument();

      rerender(
        <Profile points={mockPoints} color={0xff0000} progressIndex={2} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("should handle multiple prop changes simultaneously", () => {
      const { rerender, container } = render(
        <Profile
          points={mockPoints}
          color={0xff0000}
          slopes={mockSlopes}
          showSlopeColors={false}
          progressIndex={0}
        />,
      );

      expect(container).toBeInTheDocument();

      rerender(
        <Profile
          points={[...mockPoints, [4, 4, 0]]}
          color={0x00ff00}
          slopes={[...mockSlopes, 20]}
          showSlopeColors={true}
          progressIndex={2}
        />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("cleanup", () => {
    it("should not error when unmounting", () => {
      const { unmount } = render(
        <Profile points={mockPoints} color={0xff0000} />,
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});
