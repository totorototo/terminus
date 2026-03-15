/**
 * Trail Overview — room id display e2e tests.
 *
 * Regression guard for commit ddddc53: the room id (6-char uppercase code)
 * must appear in the TrailOverview grid tile for both runner and follower modes.
 *
 * Selectors:
 *   .grid-tile.room-tile        container div
 *   .grid-tile.room-tile .tile-label   "Room" label
 *   .grid-tile.room-tile .tile-value   6-char code
 */

import { test, expect } from "@playwright/test";
import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

test.describe("Trail Overview — room id display", () => {
  // ── Runner mode ─────────────────────────────────────────────────────────────

  test.describe("Runner mode", () => {
    test("room tile is absent before sharing the room code", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // The runner has not yet called shareLocation(), so no liveSessionId exists.
      await expect(page.locator(".grid-tile.room-tile")).not.toBeVisible();
    });

    test("room tile appears after sharing room code and shows a 6-char code", async ({
      page,
    }) => {
      await mockClipboard(page);
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // Trigger share — writes the room URL to window.__capturedCode
      await page.getByRole("button", { name: /share my room code/i }).click();

      const capturedUrl = await page.evaluate(() => window.__capturedCode);
      expect(capturedUrl).toBeTruthy();

      // Room tile must now be visible
      const tile = page.locator(".grid-tile.room-tile");
      await expect(tile).toBeVisible({ timeout: 5_000 });

      // Label reads "Room"
      await expect(tile.locator(".tile-label")).toHaveText(/room/i);

      // Value is a 6-char uppercase alphanumeric code
      const value = await tile.locator(".tile-value").textContent();
      expect(value?.trim()).toMatch(/^[A-Z0-9]{6}$/);
    });

    test("room code in tile matches the code in the shared URL", async ({
      page,
    }) => {
      await mockClipboard(page);
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: /share my room code/i }).click();

      const capturedUrl = await page.evaluate(() => window.__capturedCode);
      const roomCodeFromUrl = capturedUrl.split("/").pop();

      const tileValue = await page
        .locator(".grid-tile.room-tile .tile-value")
        .textContent();

      expect(tileValue?.trim()).toBe(roomCodeFromUrl.trim());
    });

    test("room tile persists after toggling slope colors", async ({ page }) => {
      await mockClipboard(page);
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: /share my room code/i }).click();

      await expect(page.locator(".grid-tile.room-tile")).toBeVisible({
        timeout: 5_000,
      });

      // Toggle slope colors — must not destroy the tile
      await page.getByRole("button", { name: /toggle slope colors/i }).click();
      await page.waitForTimeout(300);

      await expect(page.locator(".grid-tile.room-tile")).toBeVisible();
    });
  });

  // ── Follower mode ────────────────────────────────────────────────────────────

  test.describe("Follower mode", () => {
    test(
      "room tile shows the entered room code for the follower",
      { timeout: 90_000 },
      async ({ browser }) => {
        const runnerCtx = await browser.newContext({
          geolocation: FAKE_GEOLOCATION,
          permissions: ["geolocation"],
        });
        const followerCtx = await browser.newContext();

        try {
          // ── Runner: create a session and share the code ──
          const runnerPage = await runnerCtx.newPage();
          await mockClipboard(runnerPage);
          await runnerPage.goto("/");
          await selectRunnerRole(runnerPage);
          await expect(runnerPage.locator("canvas").first()).toBeVisible({
            timeout: 15_000,
          });

          await runnerPage
            .getByRole("button", { name: /share my room code/i })
            .click();

          const capturedUrl = await runnerPage.evaluate(
            () => window.__capturedCode,
          );
          const roomCode = capturedUrl.split("/").pop().trim();

          // ── Follower: join with that code ──
          const followerPage = await followerCtx.newPage();
          await followerPage.goto("/");
          await selectFollowerRole(followerPage, roomCode);

          await expect(followerPage.locator("canvas").first()).toBeVisible({
            timeout: 15_000,
          });

          // Follower's room tile must show the same 6-char code
          const tile = followerPage.locator(".grid-tile.room-tile");
          await expect(tile).toBeVisible({ timeout: 5_000 });

          const tileValue = await tile.locator(".tile-value").textContent();
          expect(tileValue?.trim()).toBe(roomCode);
        } finally {
          await runnerCtx.close();
          await followerCtx.close();
        }
      },
    );
  });
});
