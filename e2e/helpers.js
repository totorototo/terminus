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

/** "km left" stat value in the mobile bottom sheet (confirms GPX loaded/updated). */
export const kmLeft = (page) =>
  page
    .locator(".stat-item", { has: page.getByText("km left") })
    .locator(".stat-value");

/** "Auto-share location" toggle button (Find my current location / broadcast). */
export const autoShareBtn = (page) =>
  page.getByRole("button", { name: /auto-share location/i });

/**
 * Click "I'm running" on the wizard, pick the first available race, and wait
 * for the app to load.
 * Call this after page.goto("/") in any test that needs the runner (trailer) UI.
 */
export async function selectRunnerRole(page) {
  // Runner tests were written for the mobile layout (sheet panels, inline FAB).
  // Force mobile viewport so Trailer renders TopSheetPanel/BottomSheetPanel
  // instead of DesktopLayout, regardless of how the browser context was created.
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "I'm running" })
    .click({ timeout: 10000 });

  // Pick the first race from the list (waits for races to load from /races.json)
  await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
  await page.locator(".choice-btn").first().click();
}

/**
 * Go through the follower wizard steps: click "I'm following", pick the first
 * available race, enter the provided room code, then click "Follow".
 * Call this after page.goto("/").
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} roomCode - room code (16 lowercase hex chars)
 */
export async function selectFollowerRole(page, roomCode) {
  await page
    .getByRole("button", { name: "I'm following" })
    .click({ timeout: 10000 });

  // Pick the first race from the list (waits for races to load from /races.json)
  await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
  await page.locator(".choice-btn").first().click();

  await page.locator("input.code-input").fill(roomCode);
  await page.getByRole("button", { name: "Follow" }).click();
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
