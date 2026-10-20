import { expect, test as base } from "@playwright/test";
import { fileURLToPath } from "node:url";

const blockUmami = (context) =>
  context.route("https://cloud.umami.is/**", (route) => route.abort());

// e2e runs against a real prod-mode build (see playwright.config.js), so the
// Umami script actually loads. Abort it here rather than letting CI/local
// test runs report as real visitors.
//
// Multi-context specs (landscape-overlay) open
// extra contexts via browser.newContext() directly instead of the default
// `page`/`context` fixtures, so blocking only the `context` fixture misses
// them — patch browser.newContext() itself to cover every context a test
// creates, however it creates it.
export const test = base.extend({
  context: async ({ context }, use) => {
    await blockUmami(context);
    await use(context);
  },
  browser: async ({ browser }, use) => {
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...args) => {
      const context = await newContext(...args);
      await blockUmami(context);
      return context;
    };
    await use(browser);
  },
});
export { expect };

/** The route every runner spec opens (the former GRP 160 race file). */
export const GPX_FIXTURE = fileURLToPath(
  new URL("./fixtures/grp-160-2026.gpx", import.meta.url),
);

// gpxz's plan.json for the fixture, as Regimen writes it (7:30/km, 30 min
// at each LifeBase), and a faster one for pace changes (5:00/km). Remake them
// if gpxz's model changes:
//   gpxz --plan --pace 450 --life-base-stop 1800 e2e/fixtures/grp-160-2026.gpx
//   gpxz --plan --pace 300 --fatigue 0.001 --life-base-stop 1800 \
//     e2e/fixtures/grp-160-2026.gpx
export const PLAN_FIXTURE = fileURLToPath(
  new URL("./fixtures/grp-160-2026.plan.json", import.meta.url),
);
export const FAST_PLAN_FIXTURE = fileURLToPath(
  new URL("./fixtures/grp-160-2026.fast.plan.json", import.meta.url),
);
// Exported by Regimen at 8:50/km flat: misses the Restaurant Merlans cutoff.
export const SLOW_PLAN_FIXTURE = fileURLToPath(
  new URL("./fixtures/grp-160-2026.slow.plan.json", import.meta.url),
);

// A v2 plan.json with fueling, at PLAN_FIXTURE's model: 70 g carbs, 500 ml,
// 400 mg sodium per hour, a 30 min reserve, full at the Start and LifeBases and
// water at every other checkpoint. gpxz's CLI has no fueling flags yet: made
// with gpxz's fueling.supplies_default, carry_compute and plan_build.
export const FUELED_PLAN_FIXTURE = fileURLToPath(
  new URL("./fixtures/grp-160-2026.fueled.plan.json", import.meta.url),
);

/** Open the fixture's GPX and its plan.json from the wizard, landing on /run. */
export async function openRace(page) {
  await page.getByTestId("gpx-input").setInputFiles(GPX_FIXTURE);
  // The GPX is read before the plan.json can be checked against it.
  await expect(
    page.getByRole("button", { name: /open plan\.json/i }),
  ).toBeEnabled();
  await page.getByTestId("plan-input").setInputFiles(PLAN_FIXTURE);
  await page.waitForURL("**/run");
}

/** Replace the race's plan.json from the pace section, on /run. */
export const replacePlan = (page, plan) =>
  page.getByTestId("plan-input").setInputFiles(plan);
/**
 * Shared GPS fixtures — reused across multiple spec files.
 *
 * MID_TRAIL  ~50% into grp-160-2026.gpx — projects to roughly half the route remaining.
 * NEAR_START  ~10% into grp-160-2026.gpx — more trail ahead than MID_TRAIL.
 * OFF_TRAIL   Eiffel Tower — far from the route, triggers off-course handling.
 */
export const MID_TRAIL = { latitude: 42.9308, longitude: 0.154, accuracy: 10 };
export const NEAR_START = {
  latitude: 42.8195,
  longitude: 0.2671,
  accuracy: 10,
};
export const OFF_TRAIL = { latitude: 48.8584, longitude: 2.2945, accuracy: 10 };

/** "km left" stat value in the "Right now" story section (confirms GPX loaded/updated). */
export const kmLeft = (page) => nowStat(page, "km left");

/** A "Right now" figure by its label ("km left", "eta", "remaining", "vs plan"). */
export const nowStat = (page, label) =>
  page
    .locator(".now-stat", {
      has: page.locator(".now-label", { hasText: new RegExp(`^${label}$`) }),
    })
    .locator(".now-value");

/**
 * "Spot me" / "GPS on · spotting every 30 min" toggle button — same element
 * throughout, only its label and aria-pressed state change, so one locator
 * covers both enabling and disabling the broadcast.
 */
export const autoShareBtn = (page) => page.locator(".track-btn");

/** Total route distance stat in the story hero (confirms GPX loaded, no GPS fix needed). */
export const heroDistanceKm = (page) =>
  page.locator(".stat-row .stat").first().locator(".stat-value");

/**
 * Open the fixture GPX from the wizard, landing on /run.
 * Call this after page.goto("/") in any test that needs the runner (trailer) UI.
 */
export async function selectRunnerRole(page) {
  // Terminus is primarily a mobile app — force a small viewport so these
  // tests exercise the same layout most real users see, regardless of how
  // the browser context was created.
  await page.setViewportSize({ width: 390, height: 844 });

  await openRace(page);
}

/**
 * Install a clipboard mock on the page (before page.goto) that:
 *  - disables navigator.share so invites fall back to the clipboard path
 *  - captures the text written to the clipboard in window.__capturedCode
 *
 * @param {import("@playwright/test").Page} page
 */
export async function mockClipboard(page) {
  await page.addInitScript(() => {
    window.__capturedCode = null;
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.__capturedCode = text;
        },
      },
      configurable: true,
    });
  });
}

/**
 * Tap "Invite someone to follow" on the runner's page and return the follow
 * link it shares. Needs mockClipboard(runnerPage) before page.goto.
 */
export async function inviteFollower(runnerPage) {
  await runnerPage
    .getByRole("button", { name: "Invite someone to follow" })
    .click();
  await expect
    .poll(() => runnerPage.evaluate(() => window.__capturedCode))
    .toMatch(/\/follow\/[a-f0-9]{16}$/);
  return runnerPage.evaluate(() => window.__capturedCode);
}
