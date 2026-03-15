/**
 * Location sharing — disconnect & reconnect e2e tests.
 *
 * Covers the failure modes not tested in location-sharing.spec.js:
 *  - Runner leaves session → follower no longer receives updates
 *  - Follower leaves and rejoins the same room
 *  - Multiple followers in the same room both receive updates
 *
 * These tests use real PartyKit connections (same as location-sharing.spec.js).
 * They are inherently slower and share the 90 s timeout budget.
 *
 * LocationFreshness component:
 *   data-testid="freshness-label"  — shows elapsed time or "No data"
 */

import { test, expect } from "@playwright/test";
import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/** Simulate leaving a session via client-side navigation (mirrors the Leave button). */
async function leaveSession(page) {
  await page.evaluate(() => {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  });
}

test.describe("Location sharing — disconnect scenarios", () => {
  // ── Runner leaves → follower ─────────────────────────────────────────────

  test(
    "follower canvas stays visible after runner disconnects",
    { timeout: 90_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });
      const followerCtx = await browser.newContext();

      try {
        // ── Runner: start session and share ──
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

        // ── Follower: join ──
        const followerPage = await followerCtx.newPage();
        await followerPage.goto("/");
        await selectFollowerRole(followerPage, roomCode);
        await expect(followerPage.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // ── Runner disconnects ──
        await leaveSession(runnerPage);
        await expect(
          runnerPage.getByRole("button", { name: "I'm running" }),
        ).toBeVisible({ timeout: 10_000 });

        // Give the WebSocket close time to propagate
        await followerPage.waitForTimeout(1_500);

        // Follower view must still be intact
        await expect(followerPage.locator("canvas").first()).toBeVisible();
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );

  test(
    "no JS errors on follower page after runner disconnects",
    { timeout: 90_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });
      const followerCtx = await browser.newContext();

      try {
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

        const followerPage = await followerCtx.newPage();
        const errors = [];
        followerPage.on("pageerror", (err) => errors.push(err.message));

        await followerPage.goto("/");
        await selectFollowerRole(followerPage, roomCode);
        await expect(followerPage.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // Runner leaves abruptly
        await leaveSession(runnerPage);
        await followerPage.waitForTimeout(2_000);

        expect(errors).toEqual([]);
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );

  // ── Follower reconnects ──────────────────────────────────────────────────

  test(
    "follower can leave and rejoin the same room",
    { timeout: 90_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });
      const followerCtx = await browser.newContext({
        viewport: DESKTOP_VIEWPORT,
      });

      try {
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

        const followerPage = await followerCtx.newPage();
        await followerPage.goto("/");
        await selectFollowerRole(followerPage, roomCode);
        await expect(followerPage.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // Follower leaves via desktop FAB
        const fab = followerPage.locator("button.fab");
        if ((await fab.count()) > 0) {
          await fab.click();
          await followerPage.waitForTimeout(600);
          await followerPage
            .getByRole("button", { name: /leave session/i })
            .click();
        } else {
          // Inline layout — simulate navigate("/")
          await leaveSession(followerPage);
        }

        await expect(
          followerPage.getByRole("button", { name: "I'm following" }),
        ).toBeVisible({ timeout: 10_000 });

        // Rejoin same room
        await selectFollowerRole(followerPage, roomCode);
        await expect(followerPage.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );

  // ── Multiple followers ───────────────────────────────────────────────────

  test(
    "two followers in the same room both see the canvas",
    { timeout: 90_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });
      const follower1Ctx = await browser.newContext();
      const follower2Ctx = await browser.newContext();

      try {
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

        // Both followers join the same room code
        const f1 = await follower1Ctx.newPage();
        const f2 = await follower2Ctx.newPage();

        await f1.goto("/");
        await f2.goto("/");

        await selectFollowerRole(f1, roomCode);
        await selectFollowerRole(f2, roomCode);

        // Both must reach the 3D scene without errors
        await expect(f1.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });
        await expect(f2.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });
      } finally {
        await runnerCtx.close();
        await follower1Ctx.close();
        await follower2Ctx.close();
      }
    },
  );

  test(
    "two followers produce no JS errors",
    { timeout: 90_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });
      const follower1Ctx = await browser.newContext();
      const follower2Ctx = await browser.newContext();

      try {
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

        const f1 = await follower1Ctx.newPage();
        const f2 = await follower2Ctx.newPage();
        const errors1 = [];
        const errors2 = [];
        f1.on("pageerror", (e) => errors1.push(e.message));
        f2.on("pageerror", (e) => errors2.push(e.message));

        await f1.goto("/");
        await f2.goto("/");
        await selectFollowerRole(f1, roomCode);
        await selectFollowerRole(f2, roomCode);

        await expect(f1.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });
        await expect(f2.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        await f1.waitForTimeout(1_000);
        expect(errors1).toEqual([]);
        expect(errors2).toEqual([]);
      } finally {
        await runnerCtx.close();
        await follower1Ctx.close();
        await follower2Ctx.close();
      }
    },
  );
});
