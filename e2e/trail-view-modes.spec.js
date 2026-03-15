/**
 * Trail view mode e2e tests.
 *
 * Covers two independent toggles in the Commands panel:
 *  - Slope colors  (displaySlopes store flag)
 *  - 2D / 3D profile view (profileMode store flag)
 *
 * Both are verified through aria-pressed attribute changes and
 * the absence of JS errors. The 3D canvas must remain visible after
 * each toggle — a regression guard against scene teardown bugs.
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

test.describe("Trail View Modes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  // ── Slope colors ────────────────────────────────────────────────────────────

  test.describe("Slope colors toggle", () => {
    test("button has aria-pressed attribute on initial load", async ({
      page,
    }) => {
      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      const pressed = await btn.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(pressed);
    });

    test("clicking once flips aria-pressed", async ({ page }) => {
      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      const before = await btn.getAttribute("aria-pressed");

      await btn.click();

      const after = await btn.getAttribute("aria-pressed");
      expect(after).not.toBe(before);
    });

    test("clicking twice returns aria-pressed to original value", async ({
      page,
    }) => {
      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      const original = await btn.getAttribute("aria-pressed");

      await btn.click();
      await btn.click();

      expect(await btn.getAttribute("aria-pressed")).toBe(original);
    });

    test("canvas remains visible after toggling slopes", async ({ page }) => {
      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      await btn.click();
      await page.waitForTimeout(300);

      await expect(page.locator("canvas").first()).toBeVisible();
    });

    test("no JS errors when toggling slopes", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const btn = page.getByRole("button", { name: /toggle slope colors/i });
      await btn.click();
      await btn.click();
      await page.waitForTimeout(300);

      expect(errors).toEqual([]);
    });
  });

  // ── Profile / 2D-3D mode ────────────────────────────────────────────────────

  test.describe("2D / 3D profile toggle", () => {
    test("button has aria-pressed attribute on initial load", async ({
      page,
    }) => {
      const btn = page.getByRole("button", {
        name: /toggle 2d profile view/i,
      });
      const pressed = await btn.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(pressed);
    });

    test("clicking once flips aria-pressed", async ({ page }) => {
      const btn = page.getByRole("button", {
        name: /toggle 2d profile view/i,
      });
      const before = await btn.getAttribute("aria-pressed");

      await btn.click();

      const after = await btn.getAttribute("aria-pressed");
      expect(after).not.toBe(before);
    });

    test("clicking twice returns aria-pressed to original value", async ({
      page,
    }) => {
      const btn = page.getByRole("button", {
        name: /toggle 2d profile view/i,
      });
      const original = await btn.getAttribute("aria-pressed");

      await btn.click();
      await btn.click();

      expect(await btn.getAttribute("aria-pressed")).toBe(original);
    });

    test("canvas remains visible after toggling profile mode", async ({
      page,
    }) => {
      const btn = page.getByRole("button", {
        name: /toggle 2d profile view/i,
      });
      await btn.click();
      await page.waitForTimeout(500);

      await expect(page.locator("canvas").first()).toBeVisible();
    });

    test("no JS errors when toggling profile mode", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const btn = page.getByRole("button", {
        name: /toggle 2d profile view/i,
      });
      await btn.click();
      await btn.click();
      await page.waitForTimeout(300);

      expect(errors).toEqual([]);
    });

    test("trail data panel stays visible after switching to 2D", async ({
      page,
    }) => {
      const btn = page.getByRole("button", {
        name: /toggle 2d profile view/i,
      });
      await btn.click();
      await page.waitForTimeout(500);

      await expect(
        page.getByRole("region", { name: /Trail data panel/i }),
      ).toBeVisible();
    });
  });

  // ── Combined toggles ────────────────────────────────────────────────────────

  test.describe("Combined toggle interactions", () => {
    test("enabling both modes simultaneously does not crash", async ({
      page,
    }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.getByRole("button", { name: /toggle slope colors/i }).click();
      await page
        .getByRole("button", { name: /toggle 2d profile view/i })
        .click();

      await page.waitForTimeout(500);

      await expect(page.locator("canvas").first()).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("toggling both modes off restores canvas and panels", async ({
      page,
    }) => {
      // Enable both
      await page.getByRole("button", { name: /toggle slope colors/i }).click();
      await page
        .getByRole("button", { name: /toggle 2d profile view/i })
        .click();

      // Disable both
      await page.getByRole("button", { name: /toggle slope colors/i }).click();
      await page
        .getByRole("button", { name: /toggle 2d profile view/i })
        .click();

      await page.waitForTimeout(300);

      await expect(page.locator("canvas").first()).toBeVisible();
      await expect(
        page.getByRole("region", { name: /Navigation panel/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: /Trail data panel/i }),
      ).toBeVisible();
    });

    test("theme toggle combined with view mode toggle produces no errors", async ({
      page,
    }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.getByRole("button", { name: /toggle slope colors/i }).click();
      await page
        .getByRole("button", { name: /switch to (light|dark) mode/i })
        .click();
      await page
        .getByRole("button", { name: /toggle 2d profile view/i })
        .click();

      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  });
});
