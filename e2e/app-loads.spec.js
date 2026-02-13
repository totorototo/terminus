import { test, expect } from "@playwright/test";

test.describe("App Loading", () => {
  test("should load app and display canvas", async ({ page }) => {
    await page.goto("/");

    // Wait for the 3D canvas to render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test("should initialize without errors", async ({ page }) => {
    const pageErrors = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/");

    // Wait for canvas to render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify no critical errors
    expect(pageErrors).toEqual([]);
  });

  test("should display UI panels", async ({ page }) => {
    await page.goto("/");

    // Wait for the canvas to be visible (indicates app is loaded)
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Check for panels by role and aria-label
    const navigationPanel = page.getByRole("region", {
      name: /Navigation panel/,
    });
    await expect(navigationPanel).toBeVisible();

    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible();
  });
});
