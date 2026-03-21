/**
 * Minimal WebGL2 stub for jsdom + @react-three/test-renderer.
 *
 * Three.js's WebGLRenderer constructor initialises a state machine that calls
 * dozens of WebGL2 methods (texImage3D, createTexture, getExtension …) before
 * any frame is rendered.  jsdom's <canvas> has no WebGL support at all, so
 * the constructor throws and @react-three/test-renderer's configure() returns
 * an empty object → _root.render is not a function.
 *
 * This setup file runs after jsdom is ready and patches
 * HTMLCanvasElement.prototype.getContext to return a Proxy that:
 *   - exposes the WebGL2 numeric constants Three.js reads
 *   - returns sensible values from the most-queried methods (getParameter,
 *     createShader, checkFramebufferStatus …)
 *   - returns a no-op function for every other method
 *
 * No real GPU work ever happens; Three.js with frameloop:'never' never
 * calls render() so all shader/buffer APIs stay dormant after init.
 */

const GL_CONSTANTS = {
  // draw modes / buffer targets
  POINTS: 0,
  LINES: 1,
  TRIANGLES: 4,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  DYNAMIC_DRAW: 35048,

  // shader types
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
  DELETE_STATUS: 35712,

  // textures
  TEXTURE_2D: 3553,
  TEXTURE_3D: 32879,
  TEXTURE_CUBE_MAP: 34067,
  TEXTURE_2D_ARRAY: 35866,
  TEXTURE0: 33984,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TEXTURE_WRAP_R: 32882,
  NEAREST: 9728,
  LINEAR: 9729,
  LINEAR_MIPMAP_LINEAR: 9987,
  CLAMP_TO_EDGE: 33071,
  REPEAT: 10497,
  MIRRORED_REPEAT: 33648,
  RGBA: 6408,
  RGB: 6407,
  RGBA8: 32856,
  RGBA32F: 34836,
  RGBA16F: 34842,
  RGB8: 32849,
  R8: 33321,
  R16F: 33325,
  R32F: 33326,
  UNSIGNED_BYTE: 5121,
  UNSIGNED_SHORT: 5123,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,
  HALF_FLOAT: 5131,

  // framebuffer
  FRAMEBUFFER: 36160,
  RENDERBUFFER: 36161,
  DEPTH_ATTACHMENT: 36096,
  COLOR_ATTACHMENT0: 36064,
  FRAMEBUFFER_COMPLETE: 36053,
  DEPTH_COMPONENT16: 33189,
  DEPTH_COMPONENT24: 33190,
  DEPTH_COMPONENT32F: 36012,
  DEPTH24_STENCIL8: 35056,

  // blend / depth
  DEPTH_TEST: 2929,
  BLEND: 3042,
  CULL_FACE: 2884,
  BACK: 1029,
  FRONT: 1028,
  LESS: 513,
  LEQUAL: 515,
  ALWAYS: 519,
  ONE: 1,
  ZERO: 0,
  SRC_ALPHA: 770,
  ONE_MINUS_SRC_ALPHA: 771,
  SRC_COLOR: 768,
  ONE_MINUS_SRC_COLOR: 769,
  DST_ALPHA: 772,
  ONE_MINUS_DST_ALPHA: 773,
  FUNC_ADD: 32774,

  // clear
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  STENCIL_BUFFER_BIT: 1024,

  // getParameter targets → filled by makeGetParameter()
  // drawing buffer
  drawingBufferWidth: 300,
  drawingBufferHeight: 150,
  drawingBufferColorSpace: "srgb",
};

/** Returns sensible values for gl.getParameter(pname). */
function makeGetParameter() {
  const MAX_TEXTURE_SIZE = 16384;
  return function getParameter(pname) {
    switch (pname) {
      case 7936:
        return "WebGL mock vendor";
      case 7937:
        return "WebGL mock renderer";
      case 7938:
        return "WebGL 2.0 (jsdom mock)";
      case 35724:
        return "WebGL GLSL ES 3.00 (jsdom mock)";
      case 34024: // MAX_TEXTURE_SIZE
      case 34076: // MAX_CUBE_MAP_TEXTURE_SIZE
        return MAX_TEXTURE_SIZE;
      case 34921: // MAX_VERTEX_ATTRIBS
        return 16;
      case 35661: // MAX_VERTEX_TEXTURE_IMAGE_UNITS
      case 35660: // MAX_TEXTURE_IMAGE_UNITS
      case 34930: // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        return 32;
      case 36347: // MAX_VERTEX_UNIFORM_VECTORS
      case 36349: // MAX_FRAGMENT_UNIFORM_VECTORS
        return 1024;
      case 33902: // MAX_VERTEX_UNIFORM_COMPONENTS
      case 33905: // MAX_FRAGMENT_UNIFORM_COMPONENTS
        return 4096;
      case 34930: // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        return 32;
      case 36183: // MAX_SAMPLES
        return 8;
      case 3379: // MAX_TEXTURE_MAX_ANISOTROPY_EXT (from extension)
        return 16;
      case 34852: // MAX_DRAW_BUFFERS
        return 8;
      case 36063: // MAX_COLOR_ATTACHMENTS
        return 8;
      default:
        return 0;
    }
  };
}

function makeWebGL2Context() {
  const handler = {
    get(target, prop) {
      // Numeric constants and special properties
      if (prop in GL_CONSTANTS) return GL_CONSTANTS[prop];
      if (typeof prop === "symbol") return undefined;

      // Methods that must return specific values
      if (prop === "getParameter") return makeGetParameter();
      if (prop === "createShader") return () => ({});
      if (prop === "createProgram") return () => ({});
      if (prop === "createBuffer") return () => ({});
      if (prop === "createTexture") return () => ({});
      if (prop === "createFramebuffer") return () => ({});
      if (prop === "createRenderbuffer") return () => ({});
      if (prop === "createVertexArray") return () => ({});
      if (prop === "getShaderParameter") return () => true;
      if (prop === "getProgramParameter") return () => true;
      if (prop === "getShaderInfoLog") return () => "";
      if (prop === "getProgramInfoLog") return () => "";
      if (prop === "checkFramebufferStatus") return () => 36053; // FRAMEBUFFER_COMPLETE
      if (prop === "getSupportedExtensions") return () => [];
      if (prop === "getExtension") return () => null;
      if (prop === "getUniformLocation") return () => ({});
      if (prop === "getAttribLocation") return () => 0;
      if (prop === "getActiveUniform") return () => null;
      if (prop === "getActiveAttrib") return () => null;

      // Everything else → no-op function
      return () => null;
    },
  };
  return new Proxy({}, handler);
}

// Patch HTMLCanvasElement once jsdom is ready (this file runs as a setupFile).
const ctx = makeWebGL2Context();
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: function mockGetContext(type) {
    if (
      type === "webgl2" ||
      type === "webgl" ||
      type === "experimental-webgl"
    ) {
      return ctx;
    }
    return null;
  },
});
