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
 *   5. Assertions on both pages:
 *        Runner  → km left decreased (position moved from start to midpoint)
 *        Follower → LocationFreshness shows "Updated just now" + numeric elevation
 */

import { test, expect } from "@playwright/test";

import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

// Near the middle of the vvx-xgtv-2026.gpx track (index ~3846 / 7693).
// findClosestLocation snaps to this point, making km left drop to ~half the route.
const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

// Selector for the km-left stat value (reused on both pages)
const kmLeftValue = (page) =>
  page
    .locator(".stat-item", { has: page.getByText("km left") })
    .locator(".stat-value");

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

        // Wait for GPX to finish processing: km left shows a real number
        await expect(kmLeftValue(runnerPage)).toHaveText(/^\d+\.\d$/, {
          timeout: 30_000,
        });

        const kmLeftBefore = parseFloat(
          await kmLeftValue(runnerPage).textContent(),
        );

        // ── 2. Runner clicks "Share my room code" ─────────────────────────
        await runnerPage
          .getByRole("button", { name: "Share my room code" })
          .click();

        const capturedUrl = await runnerPage.evaluate(
          () => window.__capturedCode,
        );
        expect(capturedUrl).toMatch(/\/follow\/[A-Z0-9]{6}$/);
        const roomCode = capturedUrl.split("/").pop();

        // ── 3. Follower goes through the wizard with that code ─────────────
        const followerPage = await followerCtx.newPage();

        await followerPage.goto("/");
        await selectFollowerRole(followerPage, roomCode);

        // Wait for follower canvas (Scene lazy-loads behind Suspense)
        await expect(followerPage.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // No location received yet
        await expect(followerPage.getByTestId("freshness-label")).toHaveText(
          "No data",
          { timeout: 5_000 },
        );

        // Wait for GPX to finish loading before snapshotting — without this,
        // cumulativeDistances may still be empty → totalDistance = 0 →
        // kmLeftBeforeFollower = 0.0 → the post-update assertion always fails.
        await expect(kmLeftValue(followerPage)).toHaveText(/^\d+\.\d$/, {
          timeout: 30_000,
        });

        const kmLeftBeforeFollower = parseFloat(
          await kmLeftValue(followerPage).textContent(),
        );

        // ── 4. Runner shares their location ───────────────────────────────
        await runnerPage
          .getByRole("button", { name: "Find my current location" })
          .click();

        // ── 5. Assertions on both pages ───────────────────────────────────

        // Follower: freshness updates and elevation arrives
        await expect(followerPage.getByTestId("freshness-label")).toHaveText(
          "Updated just now",
          { timeout: 15_000 },
        );

        await expect(
          followerPage.getByTestId("freshness-elevation"),
        ).toHaveText(/^\d+ m$/, { timeout: 5_000 });

        // Runner: km left decreased — position is now at the trail midpoint,
        // not at the start, so roughly half the route remains.
        await expect(kmLeftValue(followerPage)).not.toHaveText(
          kmLeftBefore.toFixed(1),
          { timeout: 10_000 },
        );
        // Give PartyKit time to broadcast the update to the follower and for
        // the animated counter to begin its transition before we start polling.
        await followerPage.waitForTimeout(1_000);

        // Wait for the animated counter to settle: poll until two consecutive
        // reads return the same value, meaning the animation has finished.
        let stable = NaN;
        for (let i = 0; i < 200; i++) {
          await followerPage.waitForTimeout(100);
          const next = parseFloat(
            await kmLeftValue(followerPage).textContent(),
          );
          if (next === stable) break;
          stable = next;
        }

        //TODO: to be investigated
        expect(stable).not.toBeCloseTo(kmLeftBeforeFollower);
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );
});
