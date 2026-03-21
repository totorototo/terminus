import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";

import Profile from "./Profile.jsx";

// ─── Suppress Three.js / R3F console noise in jsdom ──────────────────────────
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

// ─── Test data ────────────────────────────────────────────────────────────────
// Points are already in 3D scene-space [X, Y, Z] (output of coordinateTransforms).
// createVertices maps them to mesh vertices: top vertices keep Y, base vertices set Y=0.

/** Profile-mode coordinates: X is always 0 (flat 2-D elevation view). */
const profilePoints = [
  [0, 1.0, 0.0],
  [0, 2.0, 1.0],
  [0, 1.5, 2.0],
];

/** 3-D mode coordinates: X varies with longitude. */
const geographicPoints = [
  [1.5, 1.0, 0.0],
  [2.3, 2.0, 1.0],
  [3.1, 1.5, 2.0],
];

// Slope values per point (3 points → slopes[0] unused, [1] and [2] per segment)
const someSlopes = [0, 8, 18];

// ─── Helper ───────────────────────────────────────────────────────────────────
async function renderProfile(props = {}) {
  return ReactThreeTestRenderer.create(
    <Profile
      points={profilePoints}
      showSlopeColors={false}
      color="#f2af29"
      {...props}
    />,
  );
}

/**
 * Access the raw Three.js Mesh from the test renderer's scene.
 *
 * renderer.scene is a ReactThreeTestInstance wrapper (not a raw Three.js Scene).
 * Its .children array holds further ReactThreeTestInstance wrappers, and
 * .instance on each wrapper exposes the underlying Three.js Object3D.
 *
 * Profile renders a single <mesh>, so children[0].instance is the Mesh.
 */
function getMesh(renderer) {
  return renderer.scene.children[0].instance;
}

afterEach(async () => {});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Profile", () => {
  // ── Material selection ────────────────────────────────────────────────────
  // Profile renders one of two custom shader materials depending on showSlopeColors.
  // @react-three/test-renderer gives us the actual Three.js Mesh so we can
  // inspect mesh.material directly — no DOM, no mocking of Three.js.
  //
  // Note: @react-three/drei ships its production bundle, so class names are
  // minified.  We identify the material type by its distinctive uniforms:
  //   • SolidColorMaterial → has uniforms.baseColor  (solid section color)
  //   • SlopeMaterial      → no uniforms.baseColor   (slope shader computes color)
  describe("material selection", () => {
    it("uses SolidColorMaterial (has baseColor uniform) when showSlopeColors is false", async () => {
      const renderer = await renderProfile({ showSlopeColors: false });
      const mesh = getMesh(renderer);
      expect(mesh.material.uniforms.baseColor).toBeDefined();
    });

    it("uses SlopeMaterial (no baseColor uniform) when showSlopeColors is true", async () => {
      const renderer = await renderProfile({
        showSlopeColors: true,
        slopes: someSlopes,
      });
      const mesh = getMesh(renderer);
      expect(mesh.material.uniforms.baseColor).toBeUndefined();
    });

    it("solid mode and slope mode materials are distinct objects", async () => {
      // Verify the two renderers produce different material types by comparing
      // their uniform shapes — SolidColorMaterial has baseColor, SlopeMaterial does not.
      const solidRenderer = await renderProfile({ showSlopeColors: false });
      const slopeRenderer = await renderProfile({
        showSlopeColors: true,
        slopes: someSlopes,
      });
      const solidHasBase =
        getMesh(solidRenderer).material.uniforms.baseColor !== undefined;
      const slopeHasBase =
        getMesh(slopeRenderer).material.uniforms.baseColor !== undefined;
      expect(solidHasBase).toBe(true);
      expect(slopeHasBase).toBe(false);
    });
  });

  // ── Section color in solid mode ───────────────────────────────────────────
  // When showSlopeColors is false, each section gets a unique theme-interpolated
  // color passed as the `color` prop.  Sections.jsx calls getInterpolatedColor()
  // and passes the result down.  Here we verify Profile correctly writes that
  // color into the SolidColorMaterial's baseColor uniform.
  describe("section color (solid mode)", () => {
    it("sets the baseColor uniform to match the color prop", async () => {
      const renderer = await renderProfile({
        showSlopeColors: false,
        color: "#f2af29",
      });
      const mesh = getMesh(renderer);
      // shaderMaterial from @react-three/drei exposes uniforms as standard
      // THREE.ShaderMaterial uniforms: material.uniforms.baseColor.value
      expect(mesh.material.uniforms.baseColor.value.getHexString()).toBe(
        "f2af29",
      );
    });

    it("different color props produce distinct baseColor uniforms", async () => {
      // renderer.update() in @react-three/test-renderer loses the R3F Provider
      // context, causing useFrame hooks to throw.  We verify color-prop wiring
      // by creating two independent renderers with different colors.
      const rendererA = await renderProfile({
        showSlopeColors: false,
        color: "#f2af29",
      });
      const rendererB = await renderProfile({
        showSlopeColors: false,
        color: "#6E9075",
      });

      const hexA =
        getMesh(rendererA).material.uniforms.baseColor.value.getHexString();
      const hexB =
        getMesh(rendererB).material.uniforms.baseColor.value.getHexString();
      expect(hexA).toBe("f2af29");
      expect(hexB).toBe("6e9075");
      expect(hexA).not.toBe(hexB);
    });

    it("SlopeMaterial does not have a baseColor uniform", async () => {
      const renderer = await renderProfile({
        showSlopeColors: true,
        slopes: someSlopes,
      });
      const mesh = getMesh(renderer);
      expect(mesh.material.uniforms.baseColor).toBeUndefined();
    });
  });

  // ── Slope attribute (geometry) ────────────────────────────────────────────
  // The `slope` BufferAttribute is added to the BufferGeometry only when
  // showSlopeColors is true.  The SlopeMaterial fragment shader reads it to
  // determine which color band (easy / medium / difficult / hard) to use.
  describe("slope geometry attribute", () => {
    it("attaches a slope BufferAttribute when showSlopeColors is true", async () => {
      const renderer = await renderProfile({
        showSlopeColors: true,
        slopes: someSlopes,
      });
      const mesh = getMesh(renderer);
      expect(mesh.geometry.attributes.slope).toBeDefined();
    });

    it("does not attach a slope attribute when showSlopeColors is false", async () => {
      const renderer = await renderProfile({ showSlopeColors: false });
      const mesh = getMesh(renderer);
      expect(mesh.geometry.attributes.slope).toBeUndefined();
    });

    it("slope values match the slopes prop (6 vertices per segment)", async () => {
      // createVertices produces 6 vertices per segment (2 triangles × 3 vertices).
      // Profile assigns slopes[i+1] to segment i (index is 1-based).
      // slopes = [0, 8, 18] → segment 0 gets 8, segment 1 gets 18.
      const renderer = await renderProfile({
        showSlopeColors: true,
        slopes: [0, 8, 18],
      });
      const mesh = getMesh(renderer);
      const slopeArray = mesh.geometry.attributes.slope.array;

      // Segment 0: vertices 0–5 → slope value 8
      expect(slopeArray[0]).toBe(8);
      expect(slopeArray[5]).toBe(8);
      // Segment 1: vertices 6–11 → slope value 18
      expect(slopeArray[6]).toBe(18);
      expect(slopeArray[11]).toBe(18);
    });
  });

  // ── Geometry positions: 2D vs 3D ─────────────────────────────────────────
  // The coordinate transform (coordinateTransforms.js) sets X=0 for every
  // point in profile mode and X=longitude in 3D mode.  Profile receives
  // pre-transformed points and creates mesh vertices via createVertices().
  // We verify the geometry faithfully represents what it receives.
  describe("geometry positions: 2D vs 3D", () => {
    it("all vertex X-coordinates are 0 for profile-mode points (X=0)", async () => {
      const renderer = await renderProfile({ points: profilePoints });
      const mesh = getMesh(renderer);
      const pos = mesh.geometry.attributes.position.array;

      // pos is Float32Array with layout [X0,Y0,Z0, X1,Y1,Z1, …]
      const xValues = [];
      for (let i = 0; i < pos.length; i += 3) {
        xValues.push(pos[i]);
      }
      expect(xValues.every((x) => x === 0)).toBe(true);
    });

    it("vertex X-coordinates vary for 3D-mode points (X=longitude)", async () => {
      const renderer = await renderProfile({ points: geographicPoints });
      const mesh = getMesh(renderer);
      const pos = mesh.geometry.attributes.position.array;

      const xValues = [];
      for (let i = 0; i < pos.length; i += 3) {
        xValues.push(pos[i]);
      }
      // Multiple distinct X values → the trail has geographic extent
      expect(new Set(xValues).size).toBeGreaterThan(1);
    });

    it("Y-coordinates include the input elevation values", async () => {
      // profilePoints elevations: 1.0, 2.0, 1.5
      const renderer = await renderProfile({ points: profilePoints });
      const mesh = getMesh(renderer);
      const pos = mesh.geometry.attributes.position.array;

      const yValues = new Set();
      for (let i = 1; i < pos.length; i += 3) {
        yValues.add(pos[i]);
      }

      // Top vertices carry the elevation; base vertices have Y=0
      expect(yValues.has(1.0)).toBe(true);
      expect(yValues.has(2.0)).toBe(true);
      expect(yValues.has(0)).toBe(true); // base vertices
    });
  });
});
