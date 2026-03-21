import { describe, expect, it } from "vitest";

import { buildSlopeAttribute, createVertices } from "./createVertices.js";

// ─── createVertices ───────────────────────────────────────────────────────────

describe("createVertices", () => {
  it("returns an empty Float32Array for fewer than 2 points", () => {
    expect(createVertices([[0, 0, 0]])).toBeInstanceOf(Float32Array);
    expect(createVertices([[0, 0, 0]]).length).toBe(0);
  });

  it("produces 6 vertices × 3 coords per segment", () => {
    const pts = [
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
    ];
    expect(createVertices(pts).length).toBe((pts.length - 1) * 6 * 3);
  });

  // ── 2D vs 3D geometry ──────────────────────────────────────────────────────
  // In profile mode the caller passes X=0 for every point; in 3D mode X varies.
  // createVertices passes X through unchanged, so the geometry faithfully reflects
  // whatever coordinate space was used upstream.

  it("all vertex X-coordinates are 0 when points have X=0 (profile mode)", () => {
    const pts = [
      [0, 1.0, 0.0],
      [0, 2.0, 1.0],
      [0, 1.5, 2.0],
    ];
    const verts = createVertices(pts);
    const xValues = [];
    for (let i = 0; i < verts.length; i += 3) xValues.push(verts[i]);
    expect(xValues.every((x) => x === 0)).toBe(true);
  });

  it("vertex X-coordinates vary when points have differing X (3D mode)", () => {
    const pts = [
      [1.5, 1.0, 0.0],
      [2.3, 2.0, 1.0],
      [3.1, 1.5, 2.0],
    ];
    const verts = createVertices(pts);
    const xValues = [];
    for (let i = 0; i < verts.length; i += 3) xValues.push(verts[i]);
    expect(new Set(xValues).size).toBeGreaterThan(1);
  });

  it("top-vertex Y-coordinates match the input elevation values", () => {
    const pts = [
      [0, 1.0, 0.0],
      [0, 2.0, 1.0],
      [0, 1.5, 2.0],
    ];
    const verts = createVertices(pts);
    const yValues = new Set();
    for (let i = 1; i < verts.length; i += 3) yValues.add(verts[i]);
    expect(yValues.has(1.0)).toBe(true);
    expect(yValues.has(2.0)).toBe(true);
    expect(yValues.has(0)).toBe(true); // base vertices have Y=0
  });
});

// ─── buildSlopeAttribute ──────────────────────────────────────────────────────

describe("buildSlopeAttribute", () => {
  it("returns a zero-filled array when slopes is empty", () => {
    const pts = [
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
    ];
    const result = buildSlopeAttribute(pts, []);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe((pts.length - 1) * 6);
    expect([...result].every((v) => v === 0)).toBe(true);
  });

  it("returns a zero-filled array when slopes is null", () => {
    const pts = [
      [0, 0, 0],
      [1, 1, 1],
    ];
    const result = buildSlopeAttribute(pts, null);
    expect(result.length).toBe(6);
    expect([...result].every((v) => v === 0)).toBe(true);
  });

  it("assigns slopes[i+1] to segment i, repeated 6 times each", () => {
    // slopes = [0, 8, 18] → segment 0 → slopes[1]=8, segment 1 → slopes[2]=18
    const pts = [
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
    ];
    const result = buildSlopeAttribute(pts, [0, 8, 18]);
    // Segment 0: indices 0–5 → 8
    expect([...result.slice(0, 6)].every((v) => v === 8)).toBe(true);
    // Segment 1: indices 6–11 → 18
    expect([...result.slice(6, 12)].every((v) => v === 18)).toBe(true);
  });

  it("falls back to 0 for a missing slopes entry", () => {
    const pts = [
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
    ];
    // slopes only has index 0 and 1 — segment 1 (slopes[2]) is undefined → 0
    const result = buildSlopeAttribute(pts, [0, 5]);
    expect([...result.slice(0, 6)].every((v) => v === 5)).toBe(true);
    expect([...result.slice(6, 12)].every((v) => v === 0)).toBe(true);
  });
});
