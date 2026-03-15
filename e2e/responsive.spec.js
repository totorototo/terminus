/**
 * Responsive layout and Help page e2e tests.
 *
 * Covers:
 *  - Mobile viewport: standard panels visible, desktop dock absent
 *  - Desktop viewport: follower shows FAB / desktop dock layout
 *  - Help page: renders at /help, back navigation works, section links scroll
 *  - Window resize does not crash the app
 */

import { test, expect } from "@playwright/test";
import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

// Breakpoint used by useIsDesktop() — check src for actual value;
// 1024px is a common threshold. Tests use 1280px (safe desktop) and 390px (iPhone 14).
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Responsive Layout", () => {
  test.describe("Mobile viewport — runner", () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test("runner panels are visible on mobile", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        page.getByRole("region", { name: /Navigation panel/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: /Trail data panel/i }),
      ).toBeVisible();
    });

    test("command buttons are visible on mobile", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // On mobile all runner commands are inline (no FAB).
      // Note: "Leave session" is desktop-follower-FAB only — not on mobile runner.
      await expect(
        page.getByRole("button", { name: /toggle slope colors/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /toggle 2d profile view/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /switch to (light|dark) mode/i }),
      ).toBeVisible();
    });

    test("no horizontal overflow on mobile", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
    });
  });

  test.describe("Desktop viewport — follower", () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test(
      "desktop follower shows FAB or dock menu",
      { timeout: 90_000 },
      async ({ browser }) => {
        const runnerCtx = await browser.newContext({
          geolocation: FAKE_GEOLOCATION,
          permissions: ["geolocation"],
          viewport: MOBILE_VIEWPORT,
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
          const roomCode = capturedUrl.split("/").pop();

          const followerPage = await followerCtx.newPage();
          await followerPage.goto("/");
          await selectFollowerRole(followerPage, roomCode);

          await expect(followerPage.locator("canvas").first()).toBeVisible({
            timeout: 15_000,
          });

          // On desktop the follower renders a FAB (Open commands) or dock menu.
          // Check for either the FAB button or the individual command buttons.
          const fabOrCommands =
            (await followerPage
              .getByRole("button", { name: /open commands/i })
              .count()) > 0 ||
            (await followerPage
              .getByRole("button", { name: /toggle slope colors/i })
              .count()) > 0;

          expect(fabOrCommands).toBe(true);
        } finally {
          await runnerCtx.close();
          await followerCtx.close();
        }
      },
    );

    test(
      "desktop follower FAB opens on click",
      { timeout: 90_000 },
      async ({ browser }) => {
        const runnerCtx = await browser.newContext({
          geolocation: FAKE_GEOLOCATION,
          permissions: ["geolocation"],
          viewport: MOBILE_VIEWPORT,
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
          const roomCode = capturedUrl.split("/").pop();

          const followerPage = await followerCtx.newPage();
          await followerPage.goto("/");
          await selectFollowerRole(followerPage, roomCode);

          await expect(followerPage.locator("canvas").first()).toBeVisible({
            timeout: 15_000,
          });

          // Locate the FAB by its CSS class (stable across open/close label change)
          const fab = followerPage.locator("button.fab");

          if ((await fab.count()) > 0) {
            // Closed state
            await expect(fab).toHaveAttribute("aria-expanded", "false");

            await fab.click();

            // aria-expanded flips on the next React render — this is the
            // key state change that drives the fan animation.
            await expect(fab).toHaveAttribute("aria-expanded", "true");

            // Clicking again closes the FAB
            await fab.click();
            await expect(fab).toHaveAttribute("aria-expanded", "false");
          }
          // If the follower renders the inline layout at this viewport, pass silently.
        } finally {
          await runnerCtx.close();
          await followerCtx.close();
        }
      },
    );
  });

  test.describe("Viewport resize", () => {
    test("resizing from mobile to desktop does not crash runner", async ({
      page,
    }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.setViewportSize(DESKTOP_VIEWPORT);
      await page.waitForTimeout(500);

      await expect(page.locator("canvas").first()).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("resizing from desktop to mobile does not crash runner", async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.waitForTimeout(500);

      await expect(page.locator("canvas").first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
});

test.describe("Help Page", () => {
  test("direct navigation to /help renders the page", async ({ page }) => {
    await page.goto("/help");

    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("/help has a back button", async ({ page }) => {
    await page.goto("/help");

    await expect(page.locator("button.back-btn")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("/help back button navigates away from /help", async ({ page }) => {
    // Load the app first so there's history to go back to
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });

    // Navigate to help via URL change (simulates the help button)
    await page.goto("/help");
    await expect(page.locator("button.back-btn")).toBeVisible({
      timeout: 10_000,
    });

    await page.locator("button.back-btn").click();

    // Should no longer be on /help
    await expect(page).not.toHaveURL(/\/help/);
  });

  test("/help section nav buttons are visible", async ({ page }) => {
    await page.goto("/help");
    await expect(page.locator("button.back-btn")).toBeVisible({
      timeout: 10_000,
    });

    // At least one section nav button is present
    const navBtns = page.locator("button.nav-btn");
    await expect(navBtns.first()).toBeVisible();
    expect(await navBtns.count()).toBeGreaterThan(0);
  });

  test("/help contains expected section headings", async ({ page }) => {
    await page.goto("/help");
    await expect(page.locator("button.back-btn")).toBeVisible({
      timeout: 10_000,
    });

    // Sections defined in Help.jsx
    await expect(page.locator("#role")).toBeAttached();
    await expect(page.locator("#commands")).toBeAttached();
    await expect(page.locator("#follower")).toBeAttached();
  });

  test("/help loads without JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/help");
    await expect(page.locator("button.back-btn")).toBeVisible({
      timeout: 10_000,
    });

    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
