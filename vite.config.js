import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import zigar from "rollup-plugin-zigar";
import { VitePWA } from "vite-plugin-pwa";
import { gpxPlugin } from "./vite-plugin-gpx";
import dsv from "@rollup/plugin-dsv";

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Explicitly define the environment variable if it exists
    "import.meta.env.VITE_BUILD_NUMBER": JSON.stringify(
      process.env.VITE_BUILD_NUMBER || "dev",
    ),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo150.png", "logo512.png"],
      manifest: {
        name: "Terminus PWA",
        short_name: "TerminusPWA",
        description: "A PWA built with Vite",
        theme_color: "#ffffff",
        icons: [
          {
            src: "favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon",
          },
          {
            src: "logo150.png",
            type: "image/png",
            sizes: "150x150",
          },
          {
            src: "logo512.png",
            type: "image/png",
            sizes: "512x512",
          },
        ],
        screenshots: [
          {
            src: "source/image1.gif",
            sizes: "640x320",
            type: "image/gif",
            form_factor: "wide",
            label: "Application",
          },
        ],
        categories: ["utilities", "productivity", "navigation"],
        start_url: ".",
        display: "standalone",
        background_color: "#ffffff",
      },
    }),
    zigar({
      optimize: "ReleaseSmall",
      embedWASM: true,
      topLevelAwait: false,
    }),
    gpxPlugin(),
    dsv({
      processRow: (row) => ({
        ...row,
        km: parseFloat(row.km), // Convert to number
        cutoffTime: new Date(row.cutoffTime), // Convert to Date object
      }),
    }),
  ],
  worker: {
    format: "es", // Enable ES modules in workers
    plugins: [
      zigar({
        optimize: "ReleaseSmall",
        embedWASM: true,
        topLevelAwait: false,
      }),
    ],
  },
});
