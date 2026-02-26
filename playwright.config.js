import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: process.env.CI
        ? "npm run preview -- --port 5173"
        : "npm run build && npm run preview -- --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000, // 3 minutes for build + startup
    },
    // Local dev: spin up a PartyKit relay on the default port.
    // In CI the cloud relay (VITE_PARTYKIT_HOST) is already deployed and reachable.
    // The health-check URL hits party/server.js onRequest() which returns 200.
    ...(!process.env.CI
      ? [
          {
            command: "npm run party",
            url: "http://localhost:1999/parties/main/health",
            reuseExistingServer: true,
            timeout: 60_000,
          },
        ]
      : []),
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
