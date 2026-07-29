/**
 * Real end-to-end integration test for location sharing.
 *
 * No WebSocket mocking — messages flow through a real PartyKit relay:
 *   - locally: `partykit dev --port 1999` (started by playwright.config.js)
 *   - in CI:   the cloud relay deployed at VITE_PARTYKIT_HOST
 *
 * Flow:
 *   1. Runner goes through the wizard ("I'm running").
 *   2. Runner clicks "Invite someone to follow" — a follow URL lands in the
 *      clipboard.
 *   3. Follower goes through the wizard ("I'm following") and enters the code.
 *   4. Runner clicks "Spot me" — fake GPS at the trail midpoint triggers
 *      spotMe → Zig projection → PartyKit broadcast.
 *   5. Assertion on the follower page: the "Right now" km-left stat moves
 *      from its pre-fix baseline to a real value reflecting the runner's
 *      broadcast position.
 */

import { expect, test } from "@playwright/test";

import {
  autoShareBtn,
  heroDistanceKm,
  kmLeft,
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

// Near the middle of the grp-160-2026.gpx track (index ~15449 / 30899).
// findClosestLocation snaps to this point, making distance progress to ~half the route.
const FAKE_GEOLOCATION = { latitude: 42.9308, longitude: 0.154, accuracy: 10 };

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

        // Story hero visible = Trailer UI mounted
        await expect(runnerPage.locator("h1.name")).toBeVisible({
          timeout: 15_000,
        });

        // GPX pipeline gate — sections/cumulativeDistances (which spotMe's
        // findClosestLocation needs) finish after the hero's distance stat
        // populates, not merely after the trail name renders.
        await expect(heroDistanceKm(runnerPage)).not.toHaveText("0.0", {
          timeout: 30_000,
        });

        // ── 2. Runner invites someone to follow ───────────────────────────
        await runnerPage
          .getByRole("button", { name: "Invite someone to follow" })
          .click();

        const capturedUrl = await runnerPage.evaluate(
          () => window.__capturedCode,
        );
        expect(capturedUrl).toMatch(/\/follow\/[^/]+\/[a-f0-9]{16}$/);
        const roomCode = capturedUrl.split("/").pop();

        // ── 3. Follower goes through the wizard with that code ─────────────
        const followerPage = await followerCtx.newPage();

        await followerPage.goto("/");
        await selectFollowerRole(followerPage, roomCode);

        // Story hero visible on the follower too
        await expect(followerPage.locator("h1.name")).toBeVisible({
          timeout: 15_000,
        });

        // Wait for GPX to finish loading on the follower: the hero shows the
        // total route distance once cumulativeDistances are available.
        await expect(heroDistanceKm(followerPage)).not.toHaveText("0.0", {
          timeout: 30_000,
        });

        // Baseline: before any location update, km-left has no live fix yet.
        await expect(kmLeft(followerPage)).toHaveText("0");

        // ── 4. Runner broadcasts their location via "Spot me" ──────────────
        await autoShareBtn(runnerPage).click();

        // ── 5. Assertion on the follower page ──────────────────────────────
        // km-left moved off its pre-fix baseline — the projected position is
        // now at the trail midpoint, relayed live over the room.
        await expect(kmLeft(followerPage)).not.toHaveText("0", {
          timeout: 15_000,
        });
        await expect(kmLeft(followerPage)).toHaveText(/^\d+\.\d$/);
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );
});
