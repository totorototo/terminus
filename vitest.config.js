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
  },
});
