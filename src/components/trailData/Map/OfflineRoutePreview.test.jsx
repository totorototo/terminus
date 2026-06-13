import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OfflineRoutePreview, {
  projectPoints,
  VIEW,
} from "./OfflineRoutePreview.jsx";

// A short, axis-aligned-ish route in [lng, lat] order.
const ROUTE = [
  [2.0, 48.0],
  [2.1, 48.1],
  [2.2, 48.2],
];

describe("projectPoints", () => {
  it("keeps every projected point inside the viewBox", () => {
    const { toSvg } = projectPoints(ROUTE);
    for (const point of ROUTE) {
      const [x, y] = toSvg(point);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(VIEW);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(VIEW);
    }
  });

  it("flips the Y axis so higher latitude maps to a smaller y", () => {
    const { toSvg } = projectPoints(ROUTE);
    const [, ySouth] = toSvg([2.0, 48.0]);
    const [, yNorth] = toSvg([2.2, 48.2]);
    expect(yNorth).toBeLessThan(ySouth);
  });

  it("preserves longitude ordering on the x axis", () => {
    const { toSvg } = projectPoints(ROUTE);
    const [xWest] = toSvg([2.0, 48.0]);
    const [xEast] = toSvg([2.2, 48.2]);
    expect(xEast).toBeGreaterThan(xWest);
  });

  it("does not produce NaN when the route has no latitude span", () => {
    const flat = [
      [2.0, 48.0],
      [2.5, 48.0],
    ];
    const { toSvg } = projectPoints(flat);
    for (const point of flat) {
      const [x, y] = toSvg(point);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it("does not produce NaN when the route has no longitude span", () => {
    const vertical = [
      [2.0, 48.0],
      [2.0, 48.5],
    ];
    const { toSvg } = projectPoints(vertical);
    for (const point of vertical) {
      const [x, y] = toSvg(point);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it("handles very large routes without overflowing the call stack", () => {
    const huge = Array.from({ length: 200_000 }, (_, i) => [
      2 + i * 1e-6,
      48 + i * 1e-6,
    ]);
    expect(() => projectPoints(huge)).not.toThrow();
  });
});

describe("OfflineRoutePreview", () => {
  it("renders the route as a polyline with one point per coordinate", () => {
    const { container } = render(
      <OfflineRoutePreview
        coordinates={ROUTE}
        runnerPosition={null}
        routeColor="#abc"
        runnerColor="#def"
      />,
    );
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const pointCount = polyline
      .getAttribute("points")
      .trim()
      .split(/\s+/).length;
    expect(pointCount).toBe(ROUTE.length);
  });

  it("renders the runner marker only when a position is provided", () => {
    const { container, rerender } = render(
      <OfflineRoutePreview
        coordinates={ROUTE}
        runnerPosition={null}
        routeColor="#abc"
        runnerColor="#def"
      />,
    );
    expect(container.querySelector("circle")).toBeNull();

    rerender(
      <OfflineRoutePreview
        coordinates={ROUTE}
        runnerPosition={{ longitude: 2.1, latitude: 48.1 }}
        routeColor="#abc"
        runnerColor="#def"
      />,
    );
    expect(container.querySelector("circle")).not.toBeNull();
  });
});
