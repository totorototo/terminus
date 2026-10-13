import { defineConfig, devices } from "@playwright/test";

// Two modes:
//  - default (local and CI): the specs run against a preview of the build and
//    a `wrangler dev` relay from this checkout, so they test this commit's
//    party/server.js rather than whatever relay is deployed.
//  - E2E_BASE_URL set: the specs run against that deployed site and its relay
//    (CI's post-deploy smoke test); no local server is started.
const deployedUrl = process.env.E2E_BASE_URL;

// The relay host is compiled into the bundle. A shell value wins over .env,
// which points at the deployed relay.
const LOCAL_RELAY = "localhost:1999";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["blob"], ["github"]]
    : [
        ["html"],
        ["json", { outputFile: "test-results/results.json" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
      ],
  use: {
    baseURL: deployedUrl ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: deployedUrl
    ? []
    : [
        {
          // CI builds once in the build job (with the local relay host) and
          // hands the shards that dist; locally Playwright builds it.
          command: process.env.CI
            ? "npm run preview -- --port 5173"
            : "npm run build && npm run preview -- --port 5173",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 180_000, // 3 minutes for build + startup
          // Also read by the preview server's CSP (vite.config.js), which must
          // allow the local relay.
          env: { VITE_PARTYKIT_HOST: LOCAL_RELAY },
        },
        {
          command: "npm run party",
          env: { WRANGLER_SEND_METRICS: "false" },
          // party/server.js answers "ok" on any non-route path.
          url: `http://${LOCAL_RELAY}/parties/main/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
