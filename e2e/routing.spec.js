/**
 * Deep-link / URL routing e2e tests.
 *
 * Covers:
 *  - Direct navigation to /run/:raceId loads the runner (Trailer) view
 *  - Direct navigation to /follow/:raceId/:roomId loads the follower view
 *  - Unknown URL falls back to the wizard (catch-all route)
 *  - useRouteSync restores the last persisted route on a fresh page load
 *
 * Notes:
 *  - useRouteSync reads localStorage key "terminus-storage" and redirects to
 *    state.app.currentRoute when the page mounts at "/".
 *  - EPHEMERAL_ROUTES = ["/"] — "/" itself is not persisted.
 *  - The raceId in the dev fixture is the slug from races.json (e.g. "vvx-xgtv-2026").
 */

import { test, expect } from "@playwright/test";
import { mockClipboard, selectRunnerRole } from "./helpers.js";

/** Read the first raceId slug from the dev races.json fixture. */
async function getFirstRaceId(page) {
  const races = await page.evaluate(async () => {
    const res = await fetch("/races.json");
    return res.json();
  });
  // races.json is either an array of objects with an `id` field, or keyed by id
  if (Array.isArray(races)) return races[0]?.id ?? races[0]?.slug;
  return Object.keys(races)[0];
}

test.describe("Deep-link / URL routing", () => {
  // ── /run/:raceId ──────────────────────────────────────────────────────────

  test.describe("/run/:raceId", () => {
    test("direct URL loads the runner view without wizard interaction", async ({
      page,
    }) => {
      // First, discover a valid raceId via the normal fixture endpoint
      await page.goto("/");
      const raceId = await getFirstRaceId(page);
      expect(raceId).toBeTruthy();

      // Now navigate directly to the runner deep-link
      await page.goto(`/run/${raceId}`);

      // Canvas (3D scene) must appear — no wizard step needed
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });
    });

    test("direct /run/:raceId URL shows runner panels (no wizard)", async ({
      page,
    }) => {
      await page.goto("/");
      const raceId = await getFirstRaceId(page);

      await page.goto(`/run/${raceId}`);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // Runner panels must be present — proof that Trailer mounted correctly
      await expect(
        page.getByRole("region", { name: /Navigation panel/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: /Trail data panel/i }),
      ).toBeVisible();
    });

    test("direct /run/:raceId URL produces no JS errors", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/");
      const raceId = await getFirstRaceId(page);

      await page.goto(`/run/${raceId}`);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });
      await page.waitForTimeout(500);

      expect(errors).toEqual([]);
    });
  });

  // ── /follow/:raceId/:roomId ───────────────────────────────────────────────

  test.describe("/follow/:raceId/:roomId", () => {
    test(
      "direct follower URL mounts the follower view",
      { timeout: 90_000 },
      async ({ browser }) => {
        // We need a real room code from a live runner session
        const runnerCtx = await browser.newContext();
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
          // capturedUrl is the full follower join URL
          const url = new URL(capturedUrl);
          const deepLink = url.pathname; // e.g. /follow/vvx-xgtv-2026/ABC123

          const followerPage = await followerCtx.newPage();
          // Navigate directly to the deep-link — bypasses wizard entirely
          await followerPage.goto(deepLink);

          // Canvas must appear — Follower component mounted
          await expect(followerPage.locator("canvas").first()).toBeVisible({
            timeout: 15_000,
          });
        } finally {
          await runnerCtx.close();
          await followerCtx.close();
        }
      },
    );

    test(
      "direct follower deep-link produces no JS errors",
      { timeout: 90_000 },
      async ({ browser }) => {
        const runnerCtx = await browser.newContext();
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
          const url = new URL(capturedUrl);
          const deepLink = url.pathname;

          const followerPage = await followerCtx.newPage();
          const errors = [];
          followerPage.on("pageerror", (err) => errors.push(err.message));

          await followerPage.goto(deepLink);
          await expect(followerPage.locator("canvas").first()).toBeVisible({
            timeout: 15_000,
          });
          await followerPage.waitForTimeout(500);

          expect(errors).toEqual([]);
        } finally {
          await runnerCtx.close();
          await followerCtx.close();
        }
      },
    );
  });

  // ── Unknown URL (catch-all) ───────────────────────────────────────────────

  test.describe("Unknown URL — catch-all route", () => {
    test("navigating to an unknown path shows the wizard", async ({ page }) => {
      await page.goto("/this-does-not-exist");

      await expect(
        page.getByRole("button", { name: "I'm running" }),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("unknown path produces no JS errors", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/totally/unknown/path/123");
      await expect(
        page.getByRole("button", { name: "I'm running" }),
      ).toBeVisible({ timeout: 10_000 });

      expect(errors).toEqual([]);
    });
  });

  // ── useRouteSync — route persistence ─────────────────────────────────────

  test.describe("useRouteSync — last route restored on page reload", () => {
    test("reloading while on /run/:raceId stays on runner view", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // Confirm we're on a /run/... URL
      await expect(page).toHaveURL(/\/run\//);

      // Hard reload — useRouteSync should restore the route
      await page.reload();

      // Runner view must reappear (not the wizard)
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(page).toHaveURL(/\/run\//);
    });

    test("clearing localStorage then navigating to / shows the wizard", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // Wipe the persisted store — useRouteSync has no saved route to restore
      await page.evaluate(() => localStorage.removeItem("terminus-storage"));

      // Navigate to "/" explicitly (reload would stay on /run/:raceId)
      await page.goto("/");

      // With no persisted currentRoute the hook should not redirect away from "/"
      await expect(
        page.getByRole("button", { name: "I'm running" }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
