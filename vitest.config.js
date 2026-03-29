import react from "@vitejs/plugin-react";
import zigar from "rollup-plugin-zigar";
import { defineConfig } from "vitest/config";

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
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/**/*.test.{js,jsx}",
        "src/**/*.styles.{js,jsx}",
        "src/main.jsx",
        "src/sw.js",
        "src/components/**",
      ],
      thresholds: {
        lines: 30,
        functions: 20,
        branches: 33,
        statements: 30,
      },
    },
  },
});
