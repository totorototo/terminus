/**
 * Commands panel e2e tests.
 *
 * Verifies:
 *  - All runner command buttons are present and accessible
 *  - Follower is missing GPS-only and share buttons
 *  - Toggle buttons (slope colors, profile mode) reflect state via aria-pressed
 *  - Each toggle flips aria-pressed on click
 */

import { test, expect } from "@playwright/test";
import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

test.describe("Commands — Runner mode", () => {
  test("all runner command buttons are visible", async ({ browser }) => {
    const ctx = await browser.newContext({
      geolocation: FAKE_GEOLOCATION,
      permissions: ["geolocation"],
    });

    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // Mobile runner layout: spot-me, slopes, profile, share, theme.
      // "Leave session" only appears in the desktop-follower FAB.
      await expect(
        page.getByRole("button", { name: /find my current location/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /toggle slope colors/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /toggle 2d profile view/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /share my room code/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /switch to (light|dark) mode/i }),
      ).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("slope colors toggle: aria-pressed flips on click", async ({
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
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      const initialPressed = await btn.getAttribute("aria-pressed");

      await btn.click();

      const afterPressed = await btn.getAttribute("aria-pressed");
      expect(afterPressed).not.toBe(initialPressed);
    } finally {
      await ctx.close();
    }
  });

  test("slope colors toggle: second click restores original aria-pressed", async ({
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
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      const initialPressed = await btn.getAttribute("aria-pressed");

      await btn.click();
      await btn.click();

      expect(await btn.getAttribute("aria-pressed")).toBe(initialPressed);
    } finally {
      await ctx.close();
    }
  });

  test("2D profile toggle: aria-pressed flips on click", async ({
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
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const btn = page.getByRole("button", { name: /toggle 2d profile view/i });
      const initialPressed = await btn.getAttribute("aria-pressed");

      await btn.click();

      const afterPressed = await btn.getAttribute("aria-pressed");
      expect(afterPressed).not.toBe(initialPressed);
    } finally {
      await ctx.close();
    }
  });

  test("2D profile toggle: second click restores original aria-pressed", async ({
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
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const btn = page.getByRole("button", { name: /toggle 2d profile view/i });
      const initialPressed = await btn.getAttribute("aria-pressed");

      await btn.click();
      await btn.click();

      expect(await btn.getAttribute("aria-pressed")).toBe(initialPressed);
    } finally {
      await ctx.close();
    }
  });

  test("slope and profile toggles are independent", async ({ browser }) => {
    const ctx = await browser.newContext({
      geolocation: FAKE_GEOLOCATION,
      permissions: ["geolocation"],
    });

    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const slopeBtn = page.getByRole("button", {
        name: /toggle slope colors/i,
      });
      const profileBtn = page.getByRole("button", {
        name: /toggle 2d profile view/i,
      });

      const slopeBefore = await slopeBtn.getAttribute("aria-pressed");
      const profileBefore = await profileBtn.getAttribute("aria-pressed");

      await slopeBtn.click();

      // Profile button unchanged
      expect(await profileBtn.getAttribute("aria-pressed")).toBe(profileBefore);
      // Slope button changed
      expect(await slopeBtn.getAttribute("aria-pressed")).not.toBe(slopeBefore);

      await profileBtn.click();

      // Slope button still in its toggled state
      expect(await slopeBtn.getAttribute("aria-pressed")).not.toBe(slopeBefore);
      // Profile button changed
      expect(await profileBtn.getAttribute("aria-pressed")).not.toBe(
        profileBefore,
      );
    } finally {
      await ctx.close();
    }
  });

  test("share room code button writes URL to clipboard", async ({ page }) => {
    await mockClipboard(page);
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /share my room code/i }).click();

    const captured = await page.evaluate(() => window.__capturedCode);
    expect(captured).toMatch(/\/follow\/[^/]+\/[A-Z0-9]{6}$/);
  });

  test("no JS errors while interacting with all commands", async ({
    browser,
  }) => {
    const errors = [];
    const ctx = await browser.newContext({
      geolocation: FAKE_GEOLOCATION,
      permissions: ["geolocation"],
    });

    try {
      const page = await ctx.newPage();
      page.on("pageerror", (err) => errors.push(err.message));
      await mockClipboard(page);

      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: /toggle slope colors/i }).click();
      await page
        .getByRole("button", { name: /toggle 2d profile view/i })
        .click();
      await page
        .getByRole("button", { name: /switch to (light|dark) mode/i })
        .click();
      await page.getByRole("button", { name: /share my room code/i }).click();

      await page.waitForTimeout(300);
      expect(errors).toEqual([]);
    } finally {
      await ctx.close();
    }
  });
});

test.describe("Commands — Follower mode (mobile viewport)", () => {
  test(
    "follower does not have GPS or share buttons",
    { timeout: 90_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
      });
      // Mobile viewport so follower renders the inline layout (not FAB)
      const followerCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
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

        // GPS and share are runner-only — must never appear on follower
        await expect(
          followerPage.getByRole("button", {
            name: /find my current location/i,
          }),
        ).not.toBeVisible();
        await expect(
          followerPage.getByRole("button", { name: /share my room code/i }),
        ).not.toBeVisible();

        // Shared buttons present in inline mobile follower layout
        await expect(
          followerPage.getByRole("button", { name: /toggle slope colors/i }),
        ).toBeVisible();
        await expect(
          followerPage.getByRole("button", { name: /toggle 2d profile view/i }),
        ).toBeVisible();
        await expect(
          followerPage.getByRole("button", {
            name: /switch to (light|dark) mode/i,
          }),
        ).toBeVisible();
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );
});
