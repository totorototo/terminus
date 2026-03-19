/**
 * Theme toggle e2e tests.
 *
 * The app reads system preference on first load (dark / light).
 * We force a known starting state via colorScheme, then verify CSS custom
 * properties change after toggling and that the button label tracks state.
 *
 * Regression guard for: 025c183 — helicopter position must survive a theme switch.
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole, MID_TRAIL } from "./helpers.js";
import THEME from "../src/theme/Theme.js";

const DARK_BG = THEME.colors.dark["--color-background"].toLowerCase();
const LIGHT_BG = THEME.colors.light["--color-background"].toLowerCase();

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

test.describe("Theme Toggle — starting in dark mode", () => {
  test.use({ colorScheme: "dark" });

  test("toggle switches CSS vars to light mode and back", async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(() => getCssVar(page, "--color-background"))
      .toBe(DARK_BG);

    // Switch to light
    await page.getByRole("button", { name: /switch to light mode/i }).click();
    await expect
      .poll(() => getCssVar(page, "--color-background"))
      .toBe(LIGHT_BG);
    await expect(
      page.getByRole("button", { name: /switch to dark mode/i }),
    ).toBeVisible();

    // Switch back to dark
    await page.getByRole("button", { name: /switch to dark mode/i }).click();
    await expect
      .poll(() => getCssVar(page, "--color-background"))
      .toBe(DARK_BG);
  });
});

test.describe("Theme Toggle — starting in light mode", () => {
  test.use({ colorScheme: "light" });

  test("toggle switches CSS vars to dark mode", async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(() => getCssVar(page, "--color-background"))
      .toBe(LIGHT_BG);

    await page.getByRole("button", { name: /switch to dark mode/i }).click();
    await expect
      .poll(() => getCssVar(page, "--color-background"))
      .toBe(DARK_BG);
  });
});

// ── Regression: 025c183 ──────────────────────────────────────────────────────

test("GPS position is preserved after theme switch", async ({ browser }) => {
  const ctx = await browser.newContext({
    geolocation: MID_TRAIL,
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

    const kmLeft = page
      .locator(".stat-item", { has: page.getByText("km left") })
      .locator(".stat-value");
    await expect(kmLeft).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

    // Project location onto trail (~50% point)
    await page
      .getByRole("button", { name: /find my current location/i })
      .click();

    // Wait for animated counter to settle
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

    // Switch theme — projected position must be preserved
    await page.getByRole("button", { name: /switch to light mode/i }).click();
    await page.waitForTimeout(600);

    const kmAfterThemeSwitch = parseFloat(await kmLeft.textContent());
    expect(Math.abs(kmAfterThemeSwitch - kmAtMidTrail)).toBeLessThan(5);

    // Canvas still visible — 3D scene not torn down
    await expect(page.locator("canvas").first()).toBeVisible();
  } finally {
    await ctx.close();
  }
});
