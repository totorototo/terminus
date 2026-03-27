module.exports = {
  ci: {
    collect: {
      url: [`${process.env.NETLIFY_SITE_URL}/run/vvx-xgtv-2026`],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        // Category scores — error only, 3D/WASM apps have lower perf ceilings
        "categories:performance": ["error", { minScore: 0.65 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.85 }],
        // Core Web Vitals
        "first-contentful-paint": ["error", { maxNumericValue: 1000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 1500 }],
        "total-blocking-time": ["error", { maxNumericValue: 600 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.2 }],
        "speed-index": ["error", { maxNumericValue: 1500 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
