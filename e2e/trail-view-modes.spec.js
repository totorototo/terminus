/**
 * Trail view modes e2e tests.
 *
 * Covers the two visualization toggles exposed in the Commands panel:
 *  - Slope colors  (section-based → gradient coloring)
 *  - 2D / 3D profile view
 *
 * Verified through aria-pressed state changes and canvas survival after toggling.
 */

import { expect, test } from "@playwright/test";

import { selectRunnerRole } from "./helpers.js";

test.describe("Trail View Modes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("slope colors toggle switches aria-pressed and canvas stays visible", async ({
    page,
  }) => {
    const btn = page.getByRole("button", { name: /toggle slope colors/i });
    const before = await btn.getAttribute("aria-pressed");
    expect(["true", "false"]).toContain(before); // guard: attribute must be set

    await btn.click();

    await expect(btn).toHaveAttribute(
      "aria-pressed",
      before === "true" ? "false" : "true",
    );
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("2D profile toggle switches aria-pressed and canvas stays visible", async ({
    page,
  }) => {
    const btn = page.getByRole("button", { name: /toggle 2d profile view/i });
    const before = await btn.getAttribute("aria-pressed");
    expect(["true", "false"]).toContain(before); // guard: attribute must be set

    await btn.click();

    await expect(btn).toHaveAttribute(
      "aria-pressed",
      before === "true" ? "false" : "true",
    );
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("enabling both view modes simultaneously does not crash", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.getByRole("button", { name: /toggle slope colors/i }).click();
    await page.getByRole("button", { name: /toggle 2d profile view/i }).click();

    // Poll instead of sleeping — catches deferred errors after the next render
    await expect.poll(() => errors, { timeout: 2_000 }).toHaveLength(0);

    await expect(page.locator("canvas").first()).toBeVisible();
  });
});
