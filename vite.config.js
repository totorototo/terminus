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
