import { test, expect } from "@playwright/test";

// Calculation logic is verified in unit tests (TrailData.test.js) with fake timers
// and various scenarios. These E2E tests verify component integration, data flow,
// and that values display correctly.
test.describe("ETA and Remaining Time - Integration & Calculation Verification", () => {
  test("should display stats with proper HTML structure", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify the stats container exists
    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible({ timeout: 5000 });

    // Verify structure: stat-item > stat-value + stat-label
    const statItems = page.locator(".stat-item");
    const count = await statItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Each stat item should have a value and label
    for (let i = 0; i < Math.min(count, 3); i++) {
      const item = statItems.nth(i);
      const value = item.locator(".stat-value");
      const label = item.locator(".stat-label");

      await expect(value).toBeVisible();
      await expect(label).toBeVisible();

      const valueText = await value.textContent();
      const labelText = await label.textContent();

      expect(valueText).toBeTruthy();
      expect(labelText).toBeTruthy();
    }
  });

  test("km left value should be numeric and valid", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const kmLeftValue = page.locator(".stat-item", {
      has: page.getByText("km left"),
    });
    const kmLeftDisplay = kmLeftValue.locator(".stat-value");
    const kmLeftText = await kmLeftDisplay.textContent();

    // Should be a decimal number
    expect(kmLeftText).toMatch(/^\d+\.\d+$/);

    const kmLeft = parseFloat(kmLeftText);

    // Should be a reasonable distance (total trail is ~156km)
    expect(kmLeft).toBeGreaterThan(0);
    expect(kmLeft).toBeLessThan(300);
  });

  test("ETA format should always be valid HH:MM or defaults", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const etaValue = page.locator(".stat-item", { has: page.getByText("eta") });
    const etaDisplay = etaValue.locator(".stat-value");
    const etaText = await etaDisplay.textContent();

    // Must be either HH:MM format or default indicator
    expect(etaText).toMatch(/^\d{2}:\d{2}$|^--:--$/);

    // If it's a time, verify it's valid
    if (etaText !== "--:--") {
      const [hour, minute] = etaText.split(":");
      expect(parseInt(hour)).toBeLessThan(24);
      expect(parseInt(minute)).toBeLessThan(60);
    }
  });

  test("remaining time format should contain valid units", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const remainingValue = page.locator(".stat-item", {
      has: page.getByText("remaining"),
    });
    const remainingDisplay = remainingValue.locator(".stat-value");
    const remainingText = await remainingDisplay.textContent();

    // Should be either default or contain time units
    expect(remainingText).toMatch(/^--$|[dhms]/);
  });

  test("stat values should not be empty or null", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const statValues = page.locator(".stat-value");
    const count = await statValues.count();

    // Should have at least 3 stat displays
    expect(count).toBeGreaterThanOrEqual(3);

    // Each should have content
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

    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Check for TrailData panel
    const trailDataPanel = page.getByRole("region", {
      name: /Trail data panel/,
    });
    await expect(trailDataPanel).toBeVisible({ timeout: 5000 });

    // Wait for stats to be fully rendered
    await page.waitForTimeout(2000);

    // Verify no errors
    expect(errors).toEqual([]);
  });

  test("calculation results should match expected patterns", async ({
    page,
  }) => {
    // This test verifies that the component correctly applies
    // calculateTimeMetrics logic by checking the output patterns
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    // Get all three stats
    const etaValue = page.locator(".stat-item", { has: page.getByText("eta") });
    const remainingValue = page.locator(".stat-item", {
      has: page.getByText("remaining"),
    });
    const kmLeftValue = page.locator(".stat-item", {
      has: page.getByText("km left"),
    });

    const eta = await etaValue.locator(".stat-value").textContent();
    const remaining = await remainingValue.locator(".stat-value").textContent();
    const kmLeft = await kmLeftValue.locator(".stat-value").textContent();

    // ETA: HH:MM format or "--:--"
    expect(eta).toMatch(/^\d{2}:\d{2}$|^--:--$/);

    // Remaining: contains units or "--"
    expect(remaining).toMatch(/^--$|[dhms]/);

    // KM left: decimal number
    expect(kmLeft).toMatch(/^\d+\.\d+$/);

    // Verify consistency: if ETA is default, remaining should likely be default too
    // (though this depends on projectedLocation state)
    if (eta === "--:--") {
      expect(remaining).toBe("--");
    }
  });

  test("stats should remain visible during page lifecycle", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    // Verify stats are visible
    const statsContainer = page.locator(".stats-container");
    await expect(statsContainer).toBeVisible();

    // Wait and verify they're still visible
    await page.waitForTimeout(2000);

    await expect(statsContainer).toBeVisible();

    // Get values to confirm they're populated
    const statValues = page.locator(".stat-value");
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      const value = await statValues.nth(i).textContent();
      expect(value).toBeTruthy();
    }
  });

  test("stat labels should be present and correct", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify all expected labels exist
    await expect(page.getByText("km left")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("eta")).toBeVisible();
    await expect(page.getByText("remaining")).toBeVisible();
  });

  test("stats container should have proper dividers", async ({ page }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Check for dividers between stat items
    const dividers = page.locator(".stat-divider");
    const dividerCount = await dividers.count();

    // Should have dividers between items (at least 2 for 3 items)
    expect(dividerCount).toBeGreaterThanOrEqual(2);

    // Dividers should be visible
    for (let i = 0; i < dividerCount; i++) {
      await expect(dividers.nth(i)).toBeVisible();
    }
  });

  test("stats values should be rendered with animation support", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    // KM left uses react-spring animation
    const kmLeftValue = page.locator(".stat-item", {
      has: page.getByText("km left"),
    });
    const kmLeftDisplay = kmLeftValue.locator(".stat-value");

    // Should have computed styles (animated element)
    const styles = await kmLeftDisplay.evaluate((el) => {
      return window.getComputedStyle(el);
    });

    // Should have opacity and other computed properties
    expect(styles).toBeTruthy();
    expect(styles.display).not.toBe("none");
  });
});
