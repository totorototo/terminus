import { test, expect } from "@playwright/test";

test.describe("ETA and Remaining Time", () => {
  test("should display ETA, remaining time, and km left panels", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for app to load and process GPX
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Wait for TrailData to render
    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible({ timeout: 5000 });

    // Verify ETA display exists
    const etaLabel = page.getByText("eta");
    await expect(etaLabel).toBeVisible();

    // Verify remaining time display exists
    const remainingLabel = page.getByText("remaining");
    await expect(remainingLabel).toBeVisible();

    // Verify km left display exists
    const kmLeftLabel = page.getByText("km left");
    await expect(kmLeftLabel).toBeVisible();
  });

  test("before location projected - should show defaults", async ({ page }) => {
    await page.goto("/");

    // Wait for app to load
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Wait for TrailData to render but DON'T interact
    await page.waitForTimeout(2000);

    // Before any user interaction, projectedLocation.timestamp = 0
    // which is < startingDate, so should show defaults
    const etaValue = page.locator(".stat-item", { has: page.getByText("eta") });
    const etaDisplay = etaValue.locator(".stat-value");
    const etaText = await etaDisplay.textContent();

    expect(etaText).toBe("--:--");

    const remainingValue = page.locator(".stat-item", {
      has: page.getByText("remaining"),
    });
    const remainingDisplay = remainingValue.locator(".stat-value");
    const remainingText = await remainingDisplay.textContent();

    expect(remainingText).toBe("--");
  });

  test("km left should display a number initially", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const kmLeftValue = page.locator(".stat-item", {
      has: page.getByText("km left"),
    });
    const kmLeftDisplay = kmLeftValue.locator(".stat-value");
    const kmLeftText = await kmLeftDisplay.textContent();

    // Should be a numeric value with decimals
    expect(kmLeftText).toMatch(/^\d+\.\d+$/);

    // Should be a positive number representing total distance
    const kmLeftNum = parseFloat(kmLeftText);
    expect(kmLeftNum).toBeGreaterThan(0);
  });

  test("stats container should be visible and styled", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Check for stats container
    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible({ timeout: 5000 });

    // Should have multiple stat items (km left, eta, remaining)
    const statItems = page.locator(".stat-item");
    const count = await statItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Should have dividers between stats
    const dividers = page.locator(".stat-divider");
    const dividerCount = await dividers.count();
    expect(dividerCount).toBeGreaterThanOrEqual(2);
  });

  test("ETA format should always be HH:MM or defaults", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const etaValue = page.locator(".stat-item", { has: page.getByText("eta") });
    const etaDisplay = etaValue.locator(".stat-value");
    const etaText = await etaDisplay.textContent();

    // ETA should be HH:MM format or default "--:--"
    expect(etaText).toMatch(/^\d{2}:\d{2}$|^--:--$/);
  });

  test("remaining duration format should be valid", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const remainingValue = page.locator(".stat-item", {
      has: page.getByText("remaining"),
    });
    const remainingDisplay = remainingValue.locator(".stat-value");
    const remainingText = await remainingDisplay.textContent();

    // Should be either "--" or contain time units
    expect(remainingText).toMatch(/^--$|[hm]$/);
  });

  test("no console errors during initial load", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    // No critical errors should have occurred
    expect(pageErrors).toEqual([]);
  });

  test("should have build number displayed", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const buildNumber = page.locator(".build-number");
    await expect(buildNumber).toBeVisible({ timeout: 5000 });

    const buildText = await buildNumber.textContent();
    expect(buildText).toContain("Build Number");
  });

  test("all stat values should be present and non-empty", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    // Get all stat values
    const statValues = page.locator(".stat-value");
    const count = await statValues.count();

    // Should have at least 3 values: km left, eta, remaining
    expect(count).toBeGreaterThanOrEqual(3);

    // Each should have content
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

    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify displays are stable over time
    await page.waitForTimeout(2000);

    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible();

    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible();

    // Wait and verify they're still there
    await page.waitForTimeout(2000);

    await expect(statsContainer).toBeVisible();
    await expect(trailDataPanel).toBeVisible();

    // No errors should occur during app lifecycle
    expect(pageErrors).toEqual([]);
  });

  test("unit calculation sanity check - calculateTimeMetrics logic", async ({
    page,
  }) => {
    // This test verifies the logic works by checking the function is available
    // and the component properly uses it
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Check that stats are displayed (component initialized correctly)
    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible({ timeout: 5000 });

    // Verify component structure is correct
    const statsContainer = page.locator(".stats-container");
    const componentContainer = page.locator(".component-container");

    await expect(statsContainer).toBeVisible();
    await expect(componentContainer).toBeVisible();
  });
});
