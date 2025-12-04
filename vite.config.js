import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import zigar from "rollup-plugin-zigar";
import { VitePWA } from "vite-plugin-pwa";
import arraybuffer from "vite-plugin-arraybuffer";

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Three.js and React Three Fiber into separate chunk
          "three-vendor": [
            "three",
            "@react-three/fiber",
            "@react-three/drei",
            "@react-spring/three",
          ],
          // Split D3 libraries into separate chunk
          "d3-vendor": ["d3-array", "d3-scale", "d3-shape"],
          // Split React and core dependencies
          "react-vendor": ["react", "react-dom", "zustand"],
        },
      },
    },
  },
  plugins: [
    react(),
    arraybuffer(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
      },
      includeAssets: ["favicon.ico", "logo150.png", "logo512.png"],
      manifest: {
        name: "Terminus - GPS Route Analysis & 3D Trail Visualization",
        short_name: "Terminus",
        description:
          "High-performance GPS route analysis tool with interactive 3D elevation profiles, live tracking, and real-time section analytics for hiking and cycling routes.",
        theme_color: "#262424",
        background_color: "#262424",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "any",
        categories: ["sports", "navigation", "utilities"],
        lang: "en",
        dir: "ltr",
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
            purpose: "any",
          },
          {
            src: "logo192.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any maskable",
          },
          {
            src: "logo512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any maskable",
          },
        ],
        screenshots: [
          {
            src: "image1.gif",
            sizes: "640x320",
            type: "image/gif",
            form_factor: "wide",
            label: "3D Trail Visualization",
          },
        ],
      },
    }),
    zigar({
      optimize: "ReleaseSmall",
      embedWASM: true,
      topLevelAwait: false,
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
