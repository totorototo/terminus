import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

test.describe("App Loading", () => {
  test("should load app and display canvas", async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test("should initialize without errors", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/");
    await selectRunnerRole(page);

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    expect(pageErrors).toEqual([]);
  });

  test("should display UI panels", async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

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
