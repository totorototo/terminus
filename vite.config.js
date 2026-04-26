import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import zigar from "rollup-plugin-zigar";
import { defineConfig, loadEnv } from "vite";
import arraybuffer from "vite-plugin-arraybuffer";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

// ── Bundle size budget plugin ─────────────────────────────────────────────────
// Runs in the generateBundle hook so it has access to minified chunk source
// directly — no need to scan dist/ after the fact.
//
// Budgets are intentionally generous (≈2-3× typical minified size) to catch
// only catastrophic regressions.  Tighten after measuring a stable baseline
// with: ANALYZE=true npm run build
//
// chunk.name matches the manualChunks keys defined below; the entry chunk is
// always named "index".
const BUNDLE_BUDGETS = {
  "three-core": 900 * 1024, // Three.js 0.181 minified ≈ 580 KB
  "react-three-fiber": 450 * 1024, // R3F         minified ≈ 250 KB
  "react-three-drei": 700 * 1024, // Drei        minified ≈ 450 KB
  "react-spring-three": 250 * 1024, // Spring/3    minified ≈ 100 KB
  "react-vendor": 350 * 1024, // React 19    minified ≈ 200 KB
  "d3-vendor": 200 * 1024, // d3-*        minified ≈ 100 KB
  zustand: 80 * 1024, // Zustand     minified ≈  25 KB
  satori: 700 * 1024, // Satori      minified ≈ 400 KB
  index: 2_000 * 1024, // Main chunk (includes embedded WASM)
};

function bundleSizePlugin() {
  return {
    name: "bundle-size-check",
    generateBundle(_options, bundle) {
      const fmt = (b) =>
        b >= 1024 * 1024
          ? `${(b / 1024 / 1024).toFixed(2)} MB`
          : `${(b / 1024).toFixed(1)} KB`;

      const failures = [];

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const budget = BUNDLE_BUDGETS[chunk.name];
        if (!budget) continue;
        const size = Buffer.byteLength(chunk.code, "utf8");
        const status = size > budget ? "❌ OVER" : "✅ ok";
        console.log(
          `  ${status}  ${chunk.name.padEnd(22)} ${fmt(size).padStart(9)} / ${fmt(budget)}`,
        );
        if (size > budget) {
          failures.push(
            `${chunk.name}: ${fmt(size)} exceeds budget of ${fmt(budget)}`,
          );
        }
      }

      if (failures.length > 0) {
        this.error(
          `\nBundle size budget exceeded:\n  ${failures.join("\n  ")}\n` +
            `Tighten code-splitting or update BUNDLE_BUDGETS in vite.config.js.`,
        );
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const partykitHost = env.VITE_PARTYKIT_HOST;
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cloud.umami.is",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src 'self'${partykitHost ? ` https://${partykitHost} wss://${partykitHost}` : ""} blob: data: https://cdn.jsdelivr.net https://cloud.umami.is https://api-gateway.umami.dev https://www.gstatic.com https://api.open-meteo.com`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");

  return {
    // Satori's Yoga layout engine reads process.env.NODE_ENV — shim it for the browser
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        mode === "production" ? "production" : "development",
      ),
    },
    build: {
      modulePreload: {
        resolveDependencies: (_filename, deps) => {
          // Only preload small shared vendor chunks (zustand, react-vendor).
          // Exclude heavy 3D / data-viz chunks — they are lazy-loaded per route.
          const heavy = /three|drei|fiber|spring|d3-vendor|Scene|TrailData/;
          return deps.filter((d) => !heavy.test(d));
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Split Three.js core
            "three-core": ["three"],
            // Split React Three Fiber separately
            "react-three-fiber": ["@react-three/fiber"],
            // Split Drei helpers separately
            "react-three-drei": ["@react-three/drei"],
            // Split React Spring Three
            "react-spring-three": ["@react-spring/three"],
            // Split D3 libraries into separate chunk
            "d3-vendor": ["d3-array", "d3-scale", "d3-shape"],
            // Split React and core dependencies
            "react-vendor": ["react", "react-dom"],
            // Split Zustand separately for better caching
            zustand: ["zustand"],
            // Satori is only loaded on-demand (trail card share) — keep it isolated
            satori: ["satori"],
          },
        },
      },
      // Enable compression for better delivery
      minify: "terser",
      chunkSizeWarningLimit: 1000,
      // Disable compression for faster builds in CI
      sourcemap: !process.env.GITHUB_ACTIONS,
    },
    ssr: {
      noExternal: ["zigar-runtime"],
    },
    optimizeDeps: {
      exclude: ["zigar-runtime"],
    },
    plugins: [
      react(),
      arraybuffer(),
      !process.env.GITHUB_ACTIONS &&
        compression({
          algorithm: "brotliCompress",
          ext: ".br",
          deleteOriginFile: false,
        }),
      !process.env.GITHUB_ACTIONS &&
        compression({
          algorithm: "gzip",
          ext: ".gz",
          deleteOriginFile: false,
        }),
      process.env.ANALYZE && visualizer({ open: false }),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.js",
        registerType: "autoUpdate",
        injectRegister: "script-defer",
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        },
        includeAssets: [
          "favicon.ico",
          "logo150.png",
          "logo512.png",
          "apple-touch-icon.png",
        ],
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
          orientation: "portrait",
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
      bundleSizePlugin(),
    ].filter(Boolean),
    worker: {
      format: "es", // Enable ES modules in workers
      plugins: () => [
        zigar({
          optimize: "ReleaseSmall",
          embedWASM: true,
          topLevelAwait: false,
        }),
      ],
    },
    preview: {
      headers: {
        "Content-Security-Policy": csp,
      },
    },
  };
});
