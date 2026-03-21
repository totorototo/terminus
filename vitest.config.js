import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import zigar from "rollup-plugin-zigar";

export default defineConfig({
  plugins: [
    react(),
    zigar({
      optimize: "ReleaseSmall",
      embedWASM: true,
      topLevelAwait: false,
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["src/test-utils/webgl-mock.js"],
    deps: {
      // Force @react-three packages through Vite's transform so they share
      // the same Three.js instance as the project code.  Without this,
      // the test renderer and the component each get their own Three.js
      // copy → "Multiple instances of Three.js" → instanceof checks fail.
      inline: ["@react-three/test-renderer", "@react-three/fiber"],
    },
  },
});
