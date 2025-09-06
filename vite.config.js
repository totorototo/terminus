import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import zigar from "rollup-plugin-zigar";
import { gpxPlugin } from "./vite-plugin-gpx";
import dsv from "@rollup/plugin-dsv";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    zigar({
      optimize: "ReleaseSmall",
      embedWASM: true,
      topLevelAwait: false
    }),
    gpxPlugin(),
    dsv(),
  ],
  worker: {
    format: 'es', // Enable ES modules in workers
    plugins: [
      zigar({
        optimize: "ReleaseSmall",
        embedWASM: true,
        topLevelAwait: false
      }),
    ]
  },
});
