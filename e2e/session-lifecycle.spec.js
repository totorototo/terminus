/**
 * Session lifecycle e2e tests.
 *
 * Verifies that navigating back to "/" (leaving a session) fully resets the
 * app state and returns the user to the wizard, and that a new session can be
 * started cleanly afterwards.
 *
 * Note: the mobile / runner layout has no "Leave session" button — that button
 * only appears inside the desktop-follower FAB. Leaving is modelled here by
 * navigating to "/" directly, which is what the leave button does internally
 * (navigate("/")). The follower desktop-FAB leave button is tested separately
 * in responsive.spec.js.
 */

import { test, expect } from "@playwright/test";
import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

/**
 * Simulate leaving a session the same way the "Leave session" button does:
 * a client-side wouter navigate("/") via pushState + popstate.
 *
 * This unmounts the Trailer component (triggering its cleanup useEffect which
 * calls disconnectTrailerSession + setMode(null)) and mounts the Wizard.
 * A full page.goto("/") would be intercepted by useRouteSync which restores
 * the last persisted route — that's why we use a client-side navigation here.
 */
async function leaveSession(page) {
  await page.evaluate(() => {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  });
}

test.describe("Session Lifecycle", () => {
  test.describe("Runner session", () => {
    test("navigating to / returns to wizard", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await leaveSession(page);

      // Wizard should reappear
      await expect(
        page.getByRole("button", { name: "I'm running" }),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("wizard is clean after leaving — no stale race data", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await leaveSession(page);

      // Wizard step 1 is visible, canvas is gone
      await expect(page.getByText("What are you doing today?")).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator("canvas").first()).not.toBeVisible();
    });

    test("can start a new runner session after leaving", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await leaveSession(page);
      await expect(
        page.getByRole("button", { name: "I'm running" }),
      ).toBeVisible({ timeout: 10_000 });

      // Start a second session
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // UI panels should be present as in a normal fresh load
      await expect(
        page.getByRole("region", { name: /Navigation panel/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: /Trail data panel/i }),
      ).toBeVisible();
    });

    test("km-left is a valid number after leaving and restarting session", async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });

      try {
        const page = await ctx.newPage();
        await page.goto("/");
        await selectRunnerRole(page);

        const kmLeft = page
          .locator(".stat-item", { has: page.getByText("km left") })
          .locator(".stat-value");
        await expect(kmLeft).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

        // Project GPS location
        await page
          .getByRole("button", { name: /find my current location/i })
          .click();

        // Wait for a non-zero km-left value to appear
        await expect
          .poll(async () => parseFloat(await kmLeft.textContent()), {
            timeout: 15_000,
          })
          .toBeGreaterThan(0);

        // Leave and restart
        await leaveSession(page);
        await expect(
          page.getByRole("button", { name: "I'm running" }),
        ).toBeVisible({ timeout: 10_000 });

        await selectRunnerRole(page);

        // km-left must be a valid, positive number after restarting.
        // (GPS state may persist across sessions — this is expected app behaviour.)
        await expect(kmLeft).toHaveText(/^\d+\.\d/, { timeout: 30_000 });
        const kmAfterRestart = parseFloat(await kmLeft.textContent());
        expect(kmAfterRestart).toBeGreaterThan(0);
        expect(kmAfterRestart).toBeLessThan(300);
      } finally {
        await ctx.close();
      }
    });

    test("no JS errors during leave → rejoin flow", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await leaveSession(page);
      await expect(
        page.getByRole("button", { name: "I'm running" }),
      ).toBeVisible({ timeout: 10_000 });

      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      expect(errors).toEqual([]);
    });
  });

  test.describe("Follower session", () => {
    test(
      "'Leave session' from desktop follower FAB returns to wizard",
      { timeout: 90_000 },
      async ({ browser }) => {
        // Desktop viewport so the follower renders the FAB with a leave button
        const runnerCtx = await browser.newContext({
          geolocation: FAKE_GEOLOCATION,
          permissions: ["geolocation"],
        });
        const followerCtx = await browser.newContext({
          viewport: { width: 1280, height: 800 },
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
          const roomCode = capturedUrl.split("/").pop();

          const followerPage = await followerCtx.newPage();
          await followerPage.goto("/");
          await selectFollowerRole(followerPage, roomCode);

          await expect(followerPage.locator("canvas").first()).toBeVisible({
            timeout: 15_000,
          });

          // Open the FAB to reveal buttons
          const fab = followerPage.getByRole("button", {
            name: /open commands/i,
          });
          if ((await fab.count()) > 0) {
            await fab.click();
            // Wait for fan animation to complete
            await followerPage.waitForTimeout(600);
          }

          await followerPage
            .getByRole("button", { name: /leave session/i })
            .click();

          await expect(
            followerPage.getByRole("button", { name: "I'm following" }),
          ).toBeVisible({ timeout: 10_000 });
        } finally {
          await runnerCtx.close();
          await followerCtx.close();
        }
      },
    );
  });
});
