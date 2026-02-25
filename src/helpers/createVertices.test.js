import { describe, expect, it } from "vitest";

import { createVertices } from "./createVertices.js";

describe("createVertices", () => {
  it("should create a flat array of vertices for a given set of points", () => {
    const points = [
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
    ];
    const vertices = createVertices(points);
    expect(vertices).toBeInstanceOf(Float32Array);
    // Each segment (points.length - 1) creates 6 vertices with 3 coordinates each
    expect(vertices.length).toBe((points.length - 1) * 6 * 3);
  });

  it("should return an empty array for insufficient points", () => {
    const points = [[0, 0, 0]];
    const vertices = createVertices(points);
    expect(vertices).toBeInstanceOf(Float32Array);
    expect(vertices.length).toBe(0);
  });
});
