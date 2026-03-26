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
  },
});
