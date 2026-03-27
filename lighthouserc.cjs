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
        // Category scores — warn only, 3D/WASM apps have lower perf ceilings
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["warn", { minScore: 0.85 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
        "categories:pwa": ["warn", { minScore: 0.6 }],
        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "total-blocking-time": ["warn", { maxNumericValue: 600 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "speed-index": ["warn", { maxNumericValue: 4000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
