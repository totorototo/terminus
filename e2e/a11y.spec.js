/**
 * Accessibility (a11y) tests.
 *
 * Combines automated axe-core WCAG scanning with targeted manual checks:
 *  - axe scans on key app states (wizard, runner story, both themes)
 *  - Every story section exposes an accessible heading
 *  - The live-tracking toggle exposes aria-pressed
 *  - App survives reduced-motion preference
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import THEME from "../src/theme/Theme.js";
import { selectRunnerRole } from "./helpers.js";

// ── Axe helper ────────────────────────────────────────────────────────────────

/** Run an axe WCAG 2.1 AA scan and return only violations. */
const axeScan = (page) =>
  new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
    .then((r) => r.violations);

// ── Wizard state ──────────────────────────────────────────────────────────────

test.describe("A11y — Wizard", () => {
  test("wizard screen has no WCAG 2.1 AA violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    const violations = await axeScan(page);
    expect(violations).toEqual([]);
  });
});

// ── Runner app state ──────────────────────────────────────────────────────────

test.describe("A11y — Runner app", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
  });

  test("runner screen has no WCAG 2.1 AA violations", async ({ page }) => {
    const violations = await axeScan(page);
    expect(violations).toEqual([]);
  });

  test("every story section has an accessible heading", async ({ page }) => {
    for (const name of [
      "Where this happens",
      "Where you are",
      /climbs$/,
      "Terrain",
      "Pace",
      "Milestones",
      "Checkpoints",
      "End of line",
    ]) {
      await expect(page.getByRole("heading", { name }).first()).toBeVisible();
    }
  });

  test("the live-tracking toggle exposes aria-pressed", async ({ page }) => {
    const btn = page.locator(".track-btn");
    const pressed = await btn.getAttribute("aria-pressed");
    expect(["true", "false"]).toContain(pressed);
  });

  test("reduced-motion preference does not crash the app", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.emulateMedia({ reducedMotion: "reduce" });

    // Allow one render cycle after preference change
    await expect.poll(() => errors, { timeout: 2_000 }).toHaveLength(0);
    await expect(page.locator("h1.name")).toBeVisible();
  });
});

// ── Theme contrast ────────────────────────────────────────────────────────────

const getCssVar = (page, name) =>
  page.evaluate(
    (prop) =>
      getComputedStyle(document.documentElement)
        .getPropertyValue(prop)
        .trim()
        .toLowerCase(),
    name,
  );

const contrastScan = (page) =>
  new AxeBuilder({ page })
    .withTags(["wcag2aa"])
    .withRules(["color-contrast"])
    .analyze()
    .then((r) => r.violations);

test.describe("A11y — Theme contrast", () => {
  // Force a known starting theme so button labels and CSS vars are predictable
  test.use({ colorScheme: "dark" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
    // Wait for theme CSS vars to settle
    await expect
      .poll(() => getCssVar(page, "--color-background"))
      .toBe(THEME.colors.dark["--color-background"].toLowerCase());
  });

  test("dark theme has no contrast violations", async ({ page }) => {
    const violations = await contrastScan(page);
    expect(violations).toEqual([]);
  });

  test("light theme has no contrast violations", async ({ page }) => {
    await page.getByRole("button", { name: /switch to light mode/i }).click();

    await expect
      .poll(() => getCssVar(page, "--color-background"), { timeout: 5_000 })
      .toBe(THEME.colors.light["--color-background"].toLowerCase());

    const violations = await contrastScan(page);
    expect(violations).toEqual([]);
  });
});
