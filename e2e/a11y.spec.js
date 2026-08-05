/**
 * Accessibility (a11y) tests.
 *
 * Combines automated axe-core WCAG scanning with targeted manual checks:
 *  - axe scans on key app states (wizard, runner story, follower story, both themes)
 *  - Every story section exposes an accessible heading
 *  - The live-tracking toggle exposes aria-pressed
 *  - App survives reduced-motion preference
 *  - Keyboard navigation reaches primary actions and shows a focus outline
 */

import AxeBuilder from "@axe-core/playwright";

import THEME from "../src/theme/Theme.js";
import { expect, selectRunnerRole, test } from "./helpers.js";

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

// ── Keyboard navigation ───────────────────────────────────────────────────────

test.describe("A11y — Keyboard navigation", () => {
  test("Tab reaches the first race choice, and Enter activates it", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });

    // why: ThemeToggle is a fixed sibling rendered ahead of the wizard's own
    // content (same DOM order as TrailerScreen/FollowerScreen), so it's the
    // first stop in tab order — the race list is the second.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator(".choice-btn").first()).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
  });

  test("a keyboard-focused control shows a visible focus outline", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const btn = page.locator(".choice-btn").first();
    await expect(btn).toBeFocused();

    const outlineWidth = await btn.evaluate(
      (el) => getComputedStyle(el).outlineWidth,
    );
    expect(outlineWidth).not.toBe("0px");
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

// ── Follower app state ────────────────────────────────────────────────────────

test.describe("A11y — Follower app", () => {
  test.beforeEach(async ({ page }) => {
    // A syntactically valid but never-broadcasting room code is enough to
    // reach the follower's pre-fix story view — the GPX loads independently
    // of whether a runner is actually connected to the room.
    await page.goto("/follow/grp-160-2026/0a1b2c3d4e5f6a7b");
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
  });

  test("follower screen has no WCAG 2.1 AA violations", async ({ page }) => {
    const violations = await axeScan(page);
    expect(violations).toEqual([]);
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
