/**
 * Theme toggle e2e tests.
 *
 * The app reads system preference on first load (dark / light).
 * We force a known starting state by emulating a dark-scheme media query,
 * then verify that clicking the theme toggle button switches the CSS custom
 * properties applied to the document root and that the button label tracks
 * the current state.
 *
 * Regression guard for: 025c183 — helicopter position must survive a theme switch.
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

// Near the middle of the vvx-xgtv-2026.gpx track — same as location-sharing.spec.js.
const FAKE_GEOLOCATION = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

// CSS custom properties that differ between light and dark themes.
const DARK_BG = "#3A3335".toLowerCase();
const LIGHT_BG = "#c4c4c4".toLowerCase();
const DARK_PRIMARY = "#f2af29".toLowerCase();
const LIGHT_PRIMARY = "#6A7FDB".toLowerCase();

/** Read a CSS custom property from the document root element. */
function getCssVar(page, name) {
  return page.evaluate(
    (prop) =>
      getComputedStyle(document.documentElement)
        .getPropertyValue(prop)
        .trim()
        .toLowerCase(),
    name,
  );
}

test.describe("Theme Toggle", () => {
  test.describe("starting in dark mode", () => {
    test.use({ colorScheme: "dark" });

    test("button label says 'Switch to light mode' in dark theme", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await expect(
        page.getByRole("button", { name: /switch to light mode/i }),
      ).toBeVisible();
    });

    test("clicking toggle switches to light mode", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const bg = await getCssVar(page, "--color-background");
      expect(bg).toBe(DARK_BG);

      await page.getByRole("button", { name: /switch to light mode/i }).click();

      // CSS vars update synchronously via styled-components re-render
      await expect
        .poll(() => getCssVar(page, "--color-background"))
        .toBe(LIGHT_BG);

      await expect
        .poll(() => getCssVar(page, "--color-primary"))
        .toBe(LIGHT_PRIMARY);
    });

    test("button label flips to 'Switch to dark mode' after toggling", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: /switch to light mode/i }).click();

      await expect(
        page.getByRole("button", { name: /switch to dark mode/i }),
      ).toBeVisible();
    });

    test("toggling twice returns to original dark theme", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: /switch to light mode/i }).click();
      await page.getByRole("button", { name: /switch to dark mode/i }).click();

      await expect
        .poll(() => getCssVar(page, "--color-background"))
        .toBe(DARK_BG);

      await expect
        .poll(() => getCssVar(page, "--color-primary"))
        .toBe(DARK_PRIMARY);
    });

    test("no JS errors during theme switch", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: /switch to light mode/i }).click();
      await page.waitForTimeout(500);

      expect(errors).toEqual([]);
    });
  });

  test.describe("starting in light mode", () => {
    test.use({ colorScheme: "light" });

    test("button label says 'Switch to dark mode' in light theme", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await expect(
        page.getByRole("button", { name: /switch to dark mode/i }),
      ).toBeVisible();
    });

    test("clicking toggle switches to dark mode", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const bg = await getCssVar(page, "--color-background");
      expect(bg).toBe(LIGHT_BG);

      await page.getByRole("button", { name: /switch to dark mode/i }).click();

      await expect
        .poll(() => getCssVar(page, "--color-background"))
        .toBe(DARK_BG);
    });
  });

  test.describe("theme switch with active GPS (regression: 025c183)", () => {
    test("helicopter position is preserved after theme switch", async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        geolocation: FAKE_GEOLOCATION,
        permissions: ["geolocation"],
        colorScheme: "dark",
      });

      try {
        const page = await ctx.newPage();
        await page.goto("/");
        await selectRunnerRole(page);
        await expect(page.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // Wait for GPX to load before projecting location
        const kmLeft = page
          .locator(".stat-item", { has: page.getByText("km left") })
          .locator(".stat-value");
        await expect(kmLeft).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

        // Project location onto trail (~50% point)
        await page
          .getByRole("button", { name: /find my current location/i })
          .click();

        // Wait for the animated counter to reach a stable non-zero value after
        // the GPS projection has resolved. Poll until two consecutive readings
        // are within 1 km of each other — animation has settled.
        let settled = 0;
        await expect
          .poll(
            async () => {
              const v = parseFloat(await kmLeft.textContent());
              if (Math.abs(v - settled) < 1) return v;
              settled = v;
              return null;
            },
            { timeout: 20_000, intervals: [500] },
          )
          .not.toBeNull();

        const kmAtMidTrail = parseFloat(await kmLeft.textContent());
        expect(kmAtMidTrail).toBeGreaterThan(0);

        // Switch theme — the projected position must be preserved.
        await page
          .getByRole("button", { name: /switch to light mode/i })
          .click();
        // Let any pending animations flush
        await page.waitForTimeout(600);

        const kmAfterThemeSwitch = parseFloat(await kmLeft.textContent());
        // Value should still be within 5 km of the pre-switch reading — not
        // reset to the full-trail distance by the theme change.
        expect(Math.abs(kmAfterThemeSwitch - kmAtMidTrail)).toBeLessThan(5);

        // Canvas still visible — 3D scene not torn down
        await expect(page.locator("canvas").first()).toBeVisible();
      } finally {
        await ctx.close();
      }
    });
  });
});
