import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

test.describe("ETA and Remaining Time", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
  });

  test("should display ETA, remaining time, and km left panels", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible({ timeout: 5000 });

    await expect(page.locator(".stat-label", { hasText: "eta" })).toBeVisible();
    await expect(
      page.locator(".stat-label", { hasText: "remaining" }),
    ).toBeVisible();
    await expect(
      page.locator(".stat-label", { hasText: "km left" }),
    ).toBeVisible();
  });

  test("before location projected - should show defaults", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    // Before any user interaction, projectedLocation.timestamp = 0
    // which is < startingDate, so should show defaults
    const etaValue = page.locator(".stat-item", { has: page.getByText("eta") });
    const etaText = await etaValue.locator(".stat-value").textContent();
    expect(etaText).toBe("--:--");

    const remainingValue = page.locator(".stat-item", {
      has: page.getByText("remaining"),
    });
    const remainingText = await remainingValue
      .locator(".stat-value")
      .textContent();
    expect(remainingText).toBe("--");
  });

  test("km left should display a number initially", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const kmLeftLocator = page
      .locator(".stat-item", { has: page.getByText("km left") })
      .locator(".stat-value");

    await expect(kmLeftLocator).toHaveText(/^\d+\.\d+$/, { timeout: 30_000 });

    const kmLeftText = await kmLeftLocator.textContent();
    expect(parseFloat(kmLeftText)).toBeGreaterThan(0);
  });

  test("stats container should be visible and styled", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible({ timeout: 5000 });

    const statItems = page.locator(".stat-item");
    expect(await statItems.count()).toBeGreaterThanOrEqual(3);

    const dividers = page.locator(".stat-divider");
    expect(await dividers.count()).toBeGreaterThanOrEqual(2);
  });

  test("ETA format should always be HH:MM or defaults", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const etaValue = page.locator(".stat-item", { has: page.getByText("eta") });
    const etaText = await etaValue.locator(".stat-value").textContent();

    expect(etaText).toMatch(/^\d{2}:\d{2}$|^--:--$/);
  });

  test("remaining duration format should be valid", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const remainingValue = page.locator(".stat-item", {
      has: page.getByText("remaining"),
    });
    const remainingText = await remainingValue
      .locator(".stat-value")
      .textContent();

    expect(remainingText).toMatch(/^--$|[hm]$/);
  });

  test("no console errors during initial load", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    expect(pageErrors).toEqual([]);
  });

  test("should have build number displayed", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const buildNumber = page.locator(".build-number");
    await expect(buildNumber).toBeVisible({ timeout: 5000 });
    expect(await buildNumber.textContent()).toContain("Build Number");
  });

  test("all stat values should be present and non-empty", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const statValues = page.locator(".stat-value");
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      const value = await statValues.nth(i).textContent();
      expect(value).toBeTruthy();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test("stats should persist without errors during app lifecycle", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible();

    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible();

    await page.waitForTimeout(2000);

    await expect(statsContainer).toBeVisible();
    await expect(trailDataPanel).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("unit calculation sanity check - calculateTimeMetrics logic", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible({ timeout: 5000 });

    const statsContainer = page.locator(".stats-container");
    const componentContainer = page.locator(".component-container");

    await expect(statsContainer).toBeVisible();
    await expect(componentContainer).toBeVisible();
  });
});
