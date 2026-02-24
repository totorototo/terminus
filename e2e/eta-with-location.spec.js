import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

// Calculation logic is verified in unit tests (TrailData.test.js) with fake timers
// and various scenarios. These E2E tests verify component integration, data flow,
// and that values display correctly.
test.describe("ETA and Remaining Time - Integration & Calculation Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
  });

  test("should display stats with proper HTML structure", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible({ timeout: 5000 });

    const statItems = page.locator(".stat-item");
    const count = await statItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const item = statItems.nth(i);
      await expect(item.locator(".stat-value")).toBeVisible();
      await expect(item.locator(".stat-label")).toBeVisible();
      expect(await item.locator(".stat-value").textContent()).toBeTruthy();
      expect(await item.locator(".stat-label").textContent()).toBeTruthy();
    }
  });

  test("km left value should be numeric and valid", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const kmLeftValue = page.locator(".stat-item", {
      has: page.getByText("km left"),
    });
    const kmLeftText = await kmLeftValue.locator(".stat-value").textContent();

    expect(kmLeftText).toMatch(/^\d+\.\d+$/);

    const kmLeft = parseFloat(kmLeftText);
    expect(kmLeft).toBeGreaterThan(0);
    expect(kmLeft).toBeLessThan(300);
  });

  test("ETA format should always be valid HH:MM or defaults", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const etaValue = page.locator(".stat-item", { has: page.getByText("eta") });
    const etaText = await etaValue.locator(".stat-value").textContent();

    expect(etaText).toMatch(/^\d{2}:\d{2}$|^--:--$/);

    if (etaText !== "--:--") {
      const [hour, minute] = etaText.split(":");
      expect(parseInt(hour)).toBeLessThan(24);
      expect(parseInt(minute)).toBeLessThan(60);
    }
  });

  test("remaining time format should contain valid units", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const remainingValue = page.locator(".stat-item", {
      has: page.getByText("remaining"),
    });
    const remainingText = await remainingValue
      .locator(".stat-value")
      .textContent();

    expect(remainingText).toMatch(/^--$|[dhms]/);
  });

  test("stat values should not be empty or null", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const statValues = page.locator(".stat-value");
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      const text = await statValues.nth(i).textContent();
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("undefined");
      expect(text).not.toContain("null");
    }
  });

  test("TrailData component should render without errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err));

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test("calculation results should match expected patterns", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const eta = await page
      .locator(".stat-item", { has: page.getByText("eta") })
      .locator(".stat-value")
      .textContent();
    const remaining = await page
      .locator(".stat-item", { has: page.getByText("remaining") })
      .locator(".stat-value")
      .textContent();
    const kmLeft = await page
      .locator(".stat-item", { has: page.getByText("km left") })
      .locator(".stat-value")
      .textContent();

    expect(eta).toMatch(/^\d{2}:\d{2}$|^--:--$/);
    expect(remaining).toMatch(/^--$|[dhms]/);
    expect(kmLeft).toMatch(/^\d+\.\d+$/);

    if (eta === "--:--") {
      expect(remaining).toBe("--");
    }
  });

  test("stats should remain visible during page lifecycle", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible();

    await page.waitForTimeout(2000);

    await expect(statsContainer).toBeVisible();

    const statValues = page.locator(".stat-value");
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      expect(await statValues.nth(i).textContent()).toBeTruthy();
    }
  });

  test("stat labels should be present and correct", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("km left")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("eta")).toBeVisible();
    await expect(page.getByText("remaining")).toBeVisible();
  });

  test("stats container should have proper dividers", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const dividers = page.locator(".stat-divider");
    const dividerCount = await dividers.count();
    expect(dividerCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < dividerCount; i++) {
      await expect(dividers.nth(i)).toBeVisible();
    }
  });

  test("stats values should be rendered with animation support", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const kmLeftValue = page.locator(".stat-item", {
      has: page.getByText("km left"),
    });
    const kmLeftDisplay = kmLeftValue.locator(".stat-value");

    const styles = await kmLeftDisplay.evaluate((el) => {
      return window.getComputedStyle(el);
    });

    expect(styles).toBeTruthy();
    expect(styles.display).not.toBe("none");
  });
});
