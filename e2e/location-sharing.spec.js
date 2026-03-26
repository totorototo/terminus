/**
 * Real end-to-end integration test for location sharing.
 *
 * No WebSocket mocking — messages flow through a real PartyKit relay:
 *   - locally: `partykit dev --port 1999` (started by playwright.config.js)
 *   - in CI:   the cloud relay deployed at VITE_PARTYKIT_HOST
 *
 * Flow:
 *   1. Runner goes through the wizard ("I'm running").
 *   2. Runner clicks "Share my room code" — a 6-char code lands in the clipboard.
 *   3. Follower goes through the wizard ("I'm following") and enters the code.
 *   4. Runner clicks "Find my current location" — fake GPS at the trail midpoint
 *      triggers spotMe → Zig projection → PartyKit broadcast.
 *   5. Assertions on the follower page (TrailProgression):
 *        - distance % advances from 0% to a non-zero value
 *        - elevation gain advances from 0 m to a non-zero value
 *        - elevation loss advances from 0 m to a non-zero value
 */

import { expect, test } from "@playwright/test";

import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

// Near the middle of the vvx-xgtv-2026.gpx track (index ~3846 / 7693).
// findClosestLocation snaps to this point, making distance progress to ~half the route.
const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

// Runner page: km-left stat in the mobile bottom sheet (confirms GPX loaded).
const kmLeftValue = (page) =>
  page
    .locator(".stat-item", { has: page.getByText("km left") })
    .locator(".stat-value");

// Follower page: TrailOverview total distance (confirms GPX loaded on follower).
// .first() scopes to TrailOverview — StageAnalytics and SectionAnalytics also
// have a "Distance" grid-tile, but they appear later in the DOM.
const totalDistanceTile = (page) =>
  page
    .locator(".grid-tile", { has: page.getByText("Distance") })
    .locator(".tile-value")
    .first();

// Follower page: TrailProgression values (location-update assertions).
const progressionPercent = (page) => page.locator(".progression-value").first();
const elevationGain = (page) => page.locator(".elevation-value").first();
const elevationLoss = (page) => page.locator(".elevation-value").nth(1);

test.describe("Location Sharing", () => {
  test(
    "runner shares location → follower receives it in real time",
    { timeout: 90_000 },
    async ({ browser }) => {
      // ── Runner context: fake GPS injected at browser level ───────────────
      const runnerCtx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });
      const followerCtx = await browser.newContext();

      try {
        // ── 1. Runner goes through the wizard ─────────────────────────────
        const runnerPage = await runnerCtx.newPage();
        await mockClipboard(runnerPage);

        await runnerPage.goto("/");
        await selectRunnerRole(runnerPage);

        // Canvas visible = Trailer UI mounted
        await expect(runnerPage.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // Wait for GPX to finish processing on the runner
        await expect(kmLeftValue(runnerPage)).toHaveText(/^\d+\.\d$/, {
          timeout: 30_000,
        });

        // ── 2. Runner clicks "Share my room code" ─────────────────────────
        await runnerPage
          .getByRole("button", { name: "Share my room code" })
          .click();

        const capturedUrl = await runnerPage.evaluate(
          () => window.__capturedCode,
        );
        expect(capturedUrl).toMatch(/\/follow\/[^/]+\/[A-F0-9]{8}$/);
        const roomCode = capturedUrl.split("/").pop();

        // ── 3. Follower goes through the wizard with that code ─────────────
        const followerPage = await followerCtx.newPage();

        await followerPage.goto("/");
        await selectFollowerRole(followerPage, roomCode);

        // Wait for follower canvas (Scene lazy-loads behind Suspense)
        await expect(followerPage.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // Wait for GPX to finish loading on the follower: TrailOverview shows
        // the total route distance once cumulativeDistances are available.
        await expect(totalDistanceTile(followerPage)).not.toHaveText("0.0 km", {
          timeout: 30_000,
        });

        // Baseline: before any location update, progression starts at zero.
        await expect(progressionPercent(followerPage)).toHaveText("0%");
        await expect(elevationGain(followerPage)).toHaveText("0 m");
        await expect(elevationLoss(followerPage)).toHaveText("0 m");

        // ── 4. Runner shares their location ───────────────────────────────
        await runnerPage
          .getByRole("button", { name: "Find my current location" })
          .click();

        // ── 5. Assertions on the follower page (TrailProgression) ─────────
        // Distance % advanced from 0 — the projected position is now at the
        // trail midpoint, so roughly half the route is marked as done.
        await expect(progressionPercent(followerPage)).not.toHaveText("0%", {
          timeout: 15_000,
        });
        await expect(progressionPercent(followerPage)).toHaveText(/^\d+%$/);

        // Elevation gain and loss are both non-zero — the cumulative values
        // at the midpoint are well above 0.
        await expect(elevationGain(followerPage)).not.toHaveText("0 m", {
          timeout: 5_000,
        });
        await expect(elevationGain(followerPage)).toHaveText(/^\d+ m$/);

        await expect(elevationLoss(followerPage)).not.toHaveText("0 m", {
          timeout: 5_000,
        });
        await expect(elevationLoss(followerPage)).toHaveText(/^\d+ m$/);
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );
});
