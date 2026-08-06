import { expect, test as base } from "@playwright/test";

const blockUmami = (context) =>
  context.route("https://cloud.umami.is/**", (route) => route.abort());

// e2e runs against a real prod-mode build (see playwright.config.js), so the
// Umami script actually loads. Abort it here rather than letting CI/local
// test runs report as real visitors.
//
// Multiplayer specs (eta-sync, location-sharing, landscape-overlay) open
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
export const kmLeft = (page) =>
  page
    .locator(".now-stat", { has: page.getByText("km left") })
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
 * Pick the first available race on the wizard and wait for the app to load.
 * Call this after page.goto("/") in any test that needs the runner (trailer) UI.
 */
export async function selectRunnerRole(page) {
  // Terminus is primarily a mobile app — force a small viewport so these
  // tests exercise the same layout most real users see, regardless of how
  // the browser context was created.
  await page.setViewportSize({ width: 390, height: 844 });

  // Pick the first race from the list (waits for races to load from /races.json)
  await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
  await page.locator(".choice-btn").first().click();
}

/**
 * Install a clipboard mock on the page (before page.goto) that:
 *  - disables navigator.share so shareLocation falls back to the clipboard path
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
