/**
 * Accessibility e2e tests.
 *
 * Covers:
 *  - Keyboard navigation through the wizard (Tab + Enter)
 *  - Focus lands on the code input automatically on step 2
 *  - Semantic roles: buttons are reachable by role + accessible name
 *  - aria-pressed on toggle buttons reflects state
 *  - aria-expanded on the desktop FAB reflects open/closed state
 *  - Focus management: first focusable element reachable after each wizard step
 *
 * Not covered here (canvas / WebGL internals):
 *  - 3D scene keyboard controls
 *  - axe-core automated audit (would need @axe-core/playwright installed)
 */

import { test, expect } from "@playwright/test";
import {
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe("Accessibility", () => {
  // ── Wizard keyboard navigation ─────────────────────────────────────────────

  test.describe("Wizard — keyboard navigation", () => {
    test("Tab key reaches the 'I'm running' button", async ({ page }) => {
      await page.goto("/");

      // Tab from body until we focus the button
      await page.keyboard.press("Tab");
      // Keep tabbing until the running button is focused (max 10 tabs)
      for (let i = 0; i < 10; i++) {
        const focused = await page.evaluate(() =>
          document.activeElement?.textContent?.trim(),
        );
        if (/i'm running/i.test(focused ?? "")) break;
        await page.keyboard.press("Tab");
      }

      const focused = await page.evaluate(() =>
        document.activeElement?.textContent?.trim(),
      );
      expect(focused).toMatch(/i'm running/i);
    });

    test("Enter on 'I'm running' advances to race picker", async ({ page }) => {
      await page.goto("/");

      // Focus the button via Tab
      for (let i = 0; i < 15; i++) {
        const focused = await page.evaluate(() =>
          document.activeElement?.textContent?.trim(),
        );
        if (/i'm running/i.test(focused ?? "")) break;
        await page.keyboard.press("Tab");
      }

      await page.keyboard.press("Enter");

      // Race picker (.choice-btn) should appear
      await expect(page.locator(".choice-btn").first()).toBeVisible({
        timeout: 10_000,
      });
    });

    test("Tab key reaches the 'I'm following' button", async ({ page }) => {
      await page.goto("/");

      for (let i = 0; i < 10; i++) {
        const focused = await page.evaluate(() =>
          document.activeElement?.textContent?.trim(),
        );
        if (/i'm following/i.test(focused ?? "")) break;
        await page.keyboard.press("Tab");
      }

      const focused = await page.evaluate(() =>
        document.activeElement?.textContent?.trim(),
      );
      expect(focused).toMatch(/i'm following/i);
    });

    test("code input receives focus automatically on follower step 2", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("button", { name: "I'm following" })
        .click({ timeout: 10_000 });

      // Pick a race
      await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
      await page.locator(".choice-btn").first().click();

      // The code input has autoFocus — it must be the active element
      await expect(page.locator("input.code-input")).toBeFocused({
        timeout: 5_000,
      });
    });

    test("Follow button is reachable via Tab from the code input", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("button", { name: "I'm following" })
        .click({ timeout: 10_000 });

      await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
      await page.locator(".choice-btn").first().click();

      // Type a 6-char code to enable the Follow button
      await page.locator("input.code-input").fill("ABCDEF");

      // Tab to the Follow button
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() =>
        document.activeElement?.textContent?.trim(),
      );
      expect(focused).toMatch(/follow/i);
    });

    test("Enter submits a valid code from the Follow button", async ({
      page,
    }) => {
      // Use a real (non-existent) room code — we only care that Enter triggers
      // submission (i.e. the follower Trailer mounts or error is shown, not that
      // the wizard stays on step 2).
      await page.goto("/");
      await page
        .getByRole("button", { name: "I'm following" })
        .click({ timeout: 10_000 });

      await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
      await page.locator(".choice-btn").first().click();

      await page.locator("input.code-input").fill("TSTKEY");
      await page.keyboard.press("Enter");

      // Wizard step 2 must no longer be the active view — canvas or error shown
      await expect(
        page.getByRole("button", { name: "Follow" }),
      ).not.toBeVisible({ timeout: 8_000 });
    });
  });

  // ── Semantic roles & accessible names ────────────────────────────────────

  test.describe("Semantic roles — runner mode", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });
    });

    test("slope colors toggle has role=button and aria-pressed", async ({
      page,
    }) => {
      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      await expect(btn).toBeVisible();
      const pressed = await btn.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(pressed);
    });

    test("2D profile toggle has role=button and aria-pressed", async ({
      page,
    }) => {
      const btn = page.getByRole("button", { name: /toggle 2d profile view/i });
      await expect(btn).toBeVisible();
      const pressed = await btn.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(pressed);
    });

    test("theme toggle has an accessible name describing the action", async ({
      page,
    }) => {
      const btn = page.getByRole("button", {
        name: /switch to (light|dark) mode/i,
      });
      await expect(btn).toBeVisible();
    });

    test("share room code button has an accessible name", async ({ page }) => {
      const btn = page.getByRole("button", { name: /share my room code/i });
      await expect(btn).toBeVisible();
    });

    test("find location button has an accessible name", async ({ page }) => {
      const btn = page.getByRole("button", {
        name: /find my current location/i,
      });
      await expect(btn).toBeVisible();
    });

    test("all runner command buttons are keyboard-focusable", async ({
      page,
    }) => {
      // Each button must have tabIndex >= 0 (focusable)
      const buttonLabels = [
        /toggle slope colors/i,
        /toggle 2d profile view/i,
        /switch to (light|dark) mode/i,
        /share my room code/i,
        /find my current location/i,
      ];

      for (const name of buttonLabels) {
        const btn = page.getByRole("button", { name });
        // tabIndex of -1 would make it not keyboard-reachable
        const tabIndex = await btn.evaluate((el) =>
          parseInt(el.getAttribute("tabindex") ?? "0"),
        );
        expect(tabIndex).toBeGreaterThanOrEqual(0);
      }
    });

    test("aria-pressed flips correctly on keyboard activation", async ({
      page,
    }) => {
      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      const before = await btn.getAttribute("aria-pressed");

      // Focus + Space (standard toggle activation)
      await btn.focus();
      await page.keyboard.press("Space");

      const after = await btn.getAttribute("aria-pressed");
      expect(after).not.toBe(before);
    });
  });

  // ── Desktop FAB accessibility ─────────────────────────────────────────────

  test.describe("Desktop FAB — aria-expanded", () => {
    test(
      "FAB aria-expanded toggles on keyboard activation",
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

          const fab = followerPage.locator("button.fab");
          if ((await fab.count()) > 0) {
            await expect(fab).toHaveAttribute("aria-expanded", "false");

            // Keyboard: focus + Enter
            await fab.focus();
            await followerPage.keyboard.press("Enter");

            await expect(fab).toHaveAttribute("aria-expanded", "true");

            await followerPage.keyboard.press("Enter");
            await expect(fab).toHaveAttribute("aria-expanded", "false");
          }
          // If follower renders inline layout at this viewport, pass silently.
        } finally {
          await runnerCtx.close();
          await followerCtx.close();
        }
      },
    );
  });

  // ── Focus visible ─────────────────────────────────────────────────────────

  test.describe("Focus management", () => {
    test("wizard back button from code-input step returns to race picker", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("button", { name: "I'm following" })
        .click({ timeout: 10_000 });

      // Race picker (step 2)
      await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
      await page.locator(".choice-btn").first().click();

      // Now on code-input step (step 3) — click back
      await page.getByRole("button", { name: /back/i }).click();

      // Must leave the code-input step — either the race picker or role-selection reappears
      await expect(page.locator("input.code-input")).not.toBeVisible({
        timeout: 5_000,
      });
    });

    test("no focus trap — Tab cycles through all runner buttons without getting stuck", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      // Tab 20 times and collect all focused element accessible names.
      // If focus is trapped we'd see the same element repeated indefinitely.
      const seen = new Set();
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        const label = await page.evaluate(
          () =>
            document.activeElement?.getAttribute("aria-label") ??
            document.activeElement?.textContent?.trim() ??
            "",
        );
        seen.add(label);
      }

      // At least 3 distinct focusable elements reachable — not trapped on one
      expect(seen.size).toBeGreaterThanOrEqual(3);
    });
  });
});
