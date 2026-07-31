/**
 * Wizard e2e tests — covers the first-run race selection flow.
 */

import { expect, test } from "@playwright/test";

test.describe("Wizard", () => {
  test("shows race choice screen on first load", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
  });

  test("picks race and launches the app", async ({ page }) => {
    await page.goto("/");

    await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
    await page.locator(".choice-btn").first().click();

    await expect(page.locator("h1.name")).toBeVisible({
      timeout: 15_000,
    });
  });
});
