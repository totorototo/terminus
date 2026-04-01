module.exports = {
  ci: {
    collect: {
      url: [`${process.env.NETLIFY_SITE_URL}/run/vvx-xgtv-2026`],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        screenEmulation: {
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        },
      },
    },
    assert: {
      assertions: {
        // Category scores — error only, 3D/WASM apps have lower perf ceilings
        "categories:performance": ["warn", { minScore: 0.65 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.95 }],
        "categories:seo": ["warn", { minScore: 0.85 }],
        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 1000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 1500 }],
        "total-blocking-time": ["warn", { maxNumericValue: 600 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.2 }],
        "speed-index": ["warn", { maxNumericValue: 1500 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
