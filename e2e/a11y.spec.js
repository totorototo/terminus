/**
 * Accessibility (a11y) tests.
 *
 * Combines automated axe-core WCAG scanning with targeted manual checks:
 *  - axe scans on key app states (wizard, runner loaded, both themes)
 *  - Canvas element has an accessible label
 *  - Toggle buttons expose aria-pressed
 *  - Key regions have accessible names
 *  - App survives reduced-motion preference
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { selectRunnerRole } from "./helpers.js";
import THEME from "../src/theme/Theme.js";

// ── Axe helper ────────────────────────────────────────────────────────────────

/**
 * Run an axe WCAG 2.1 AA scan and return only violations.
 * Excludes the canvas element — axe flags it as needing a fallback text which
 * is handled manually via aria-label below.
 */
const axeScan = (page) =>
  new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude("canvas")
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
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("runner screen has no WCAG 2.1 AA violations", async ({ page }) => {
    const violations = await axeScan(page);
    expect(violations).toEqual([]);
  });

  test("canvas has an accessible aria-label", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const label = await canvas.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label.trim().length).toBeGreaterThan(0);
  });

  test("key landmark regions have accessible names", async ({ page }) => {
    // getByRole("region") only matches elements with aria-label / aria-labelledby
    await expect(
      page.getByRole("region", { name: /Navigation panel/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: /Trail data panel/i }),
    ).toBeVisible();
  });

  test("toggle buttons expose aria-pressed", async ({ page }) => {
    const toggles = [
      page.getByRole("button", { name: /toggle slope colors/i }),
      page.getByRole("button", { name: /toggle 2d profile view/i }),
    ];
    for (const btn of toggles) {
      const pressed = await btn.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(pressed);
    }
  });

  test("reduced-motion preference does not crash the app", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.emulateMedia({ reducedMotion: "reduce" });

    // Allow one render cycle after preference change
    await expect.poll(() => errors, { timeout: 2_000 }).toHaveLength(0);
    await expect(page.locator("canvas").first()).toBeVisible();
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
    .exclude("canvas")
    .analyze()
    .then((r) => r.violations);

test.describe("A11y — Theme contrast", () => {
  // Force a known starting theme so button labels and CSS vars are predictable
  test.use({ colorScheme: "dark" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });
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
