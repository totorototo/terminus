/**
 * End-to-end test for live ETA recalibration.
 *
 * Flow (single runner, no relay needed — recalibration is local):
 *   1. Pin the clock to 2h after the race Start (2026-08-21T05:00:00Z) so the
 *      race is "already started" and the a-priori predictions render as times.
 *   2. Runner goes through the wizard; the GPX loads and the Checkpoints panel
 *      shows the a-priori finish ETA (anchored at race start, no fix yet).
 *   3. Turn on the broadcast/auto-share feature — a fake GPS fix mid-trail flows
 *      through spotMe → Zig projection → recalibrate(), which re-solves the base
 *      pace from real elapsed time and rewrites the forward ETAs.
 *   4. Assert the finish ETA changed: the prediction was recalibrated.
 *
 * The fix is injected by overriding navigator.geolocation directly (rather than
 * the browser-level geolocation) so the position's `timestamp` follows the pinned
 * clock — recalibration keys off `projectedLocation.timestamp`, and a fix dated
 * before the race start would be treated as pre-race and skipped.
 */

import { expect, test } from "@playwright/test";

import { MID_TRAIL, mockClipboard, selectRunnerRole } from "./helpers.js";

// Race Start waypoint in grp-160-2026.gpx. The clock is pinned 2h past it: at
// that point a runner already at the trail midpoint is well ahead of the a-priori
// schedule, so the calibration factor floors and the finish ETA shifts clearly.
const RACE_STARTED_AT = new Date("2026-08-21T07:00:00Z");

const autoShareBtn = (page) =>
  page.getByRole("button", { name: /auto-share location/i });

const kmLeft = (page) =>
  page
    .locator(".stat-item", { has: page.getByText("km left") })
    .locator(".stat-value");

// Checkpoints panel (SectionETA): the last .cp-eta row is the finish ETA. Scoped to
// the panel by its header text — the Life bases panel reuses the same .cp-eta class.
const finishEta = (page) =>
  page
    .locator(".carousel-item", {
      has: page.getByText("Checkpoints", { exact: true }),
    })
    .locator(".cp-eta")
    .last();

test.describe("Live Recalibration", () => {
  test("broadcasting a mid-trail fix recalibrates the finish ETA", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();

      // Pin Date.now() past the race start; timers keep running.
      await page.clock.setFixedTime(RACE_STARTED_AT);

      // Override geolocation so the fix carries a timestamp on the pinned clock.
      await page.addInitScript((pos) => {
        navigator.geolocation.getCurrentPosition = (success) =>
          success({
            coords: {
              latitude: pos.latitude,
              longitude: pos.longitude,
              accuracy: pos.accuracy,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          });
      }, MID_TRAIL);

      await mockClipboard(page);
      await page.goto("/");
      await selectRunnerRole(page);

      // Wait for the GPX to finish processing.
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

      // The Checkpoints panel (SectionETA) renders in the DOM even while the bottom
      // sheet is collapsed, so read .cp-eta directly. Capture the pre-fix finish
      // ETA (anchored at the race start, no recalibration yet).
      await expect(finishEta(page)).toBeAttached({ timeout: 10_000 });
      const beforeEta = await finishEta(page).textContent();

      // Turn on broadcast: the immediate spotMe fix triggers recalibration.
      await autoShareBtn(page).click();

      // The recalibrated forward ETA must differ from the pre-fix one, and it must
      // resolve to a real clock time (not "--:--").
      await expect
        .poll(async () => finishEta(page).textContent(), { timeout: 15_000 })
        .not.toBe(beforeEta);
      await expect(finishEta(page)).toHaveText(/^\w{3} \d{2}:\d{2}$/);
    } finally {
      await ctx.close();
    }
  });
});
