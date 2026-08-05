/**
 * Theme toggle e2e tests.
 *
 * The app reads system preference on first load (dark / light).
 * We force a known starting state via colorScheme, then verify CSS custom
 * properties change after toggling and that the button label tracks state.
 *
 * Regression guard for: 025c183 — helicopter position must survive a theme switch.
 */

import THEME from "../src/theme/Theme.js";
import {
  autoShareBtn,
  expect,
  heroDistanceKm,
  kmLeft,
  MID_TRAIL,
  mockClipboard,
  selectRunnerRole,
  test,
} from "./helpers.js";

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
    await expect(page.locator("h1.name")).toBeVisible({
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
    await expect(page.locator("h1.name")).toBeVisible({
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

test.describe("GPS position preserved after theme switch", () => {
  test.use({
    geolocation: MID_TRAIL,
    permissions: ["geolocation"],
    colorScheme: "dark",
  });

  test("GPS position is preserved after theme switch", async ({ page }) => {
    await mockClipboard(page);
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("h1.name")).toBeVisible({
      timeout: 15_000,
    });

    // GPX pipeline gate — sections/cumulativeDistances (which spotMe's
    // findClosestLocation needs) finish after the hero's distance stat
    // populates, not merely after the trail name renders.
    await expect(heroDistanceKm(page)).not.toHaveText("0.0", {
      timeout: 30_000,
    });

    // Project location onto trail (~50% point)
    await autoShareBtn(page).click();

    // Wait for the fix to land, then let the animated counter settle.
    await expect
      .poll(async () => parseFloat(await kmLeft(page).textContent()), {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
    await page.waitForTimeout(1000);

    const kmAtMidTrail = parseFloat(await kmLeft(page).textContent());
    expect(kmAtMidTrail).toBeGreaterThan(0);

    // Switch theme — projected position must be preserved
    await page.getByRole("button", { name: /switch to light mode/i }).click();
    await page.waitForTimeout(600);

    const kmAfterThemeSwitch = parseFloat(await kmLeft(page).textContent());
    expect(Math.abs(kmAfterThemeSwitch - kmAtMidTrail)).toBeLessThan(5);

    // Story still rendered — theme switch didn't tear down the page
    await expect(page.locator("h1.name")).toBeVisible();
  });
});
