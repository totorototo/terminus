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
    const consoleMessages = [];

    // Capture all console messages for debugging
    page.on("console", (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture page errors with full error details
    page.on("pageerror", (err) => {
      pageErrors.push({
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
    });

    await page.goto("/");

    // Wait for canvas to render
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Debug output if there are errors
    if (pageErrors.length > 0) {
      console.error("🔴 Page errors detected:");
      pageErrors.forEach((err) => {
        console.error(`  - ${err.name}: ${err.message}`);
        if (err.stack) {
          console.error(
            `    Stack: ${err.stack.split("\n").slice(0, 3).join("\n    ")}`,
          );
        }
      });
    }

    const errorMessages = consoleMessages.filter((m) => m.type === "error");
    if (errorMessages.length > 0) {
      console.error("🔴 Console errors detected:");
      errorMessages.forEach((msg) => {
        console.error(`  - ${msg.text}`);
      });
    }

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
