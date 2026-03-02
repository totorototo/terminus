import { test, expect } from "@playwright/test";

test.describe("Wizard", () => {
  test("should show wizard on initial load", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("What are you doing today?")).toBeVisible();
  });

  test("should display both role buttons", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "I'm running" })).toBeVisible(
      { timeout: 10000 },
    );
    await expect(
      page.getByRole("button", { name: "I'm following" }),
    ).toBeVisible();
  });

  test("I'm running — should hide wizard and show the app", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: "I'm running" })
      .click({ timeout: 10000 });

    // Step 2: pick a race
    await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
    await page.locator(".choice-btn").first().click();

    // Wizard title disappears
    await expect(page.getByText("What are you doing today?")).not.toBeVisible();

    // 3D canvas is now visible
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test("I'm following — should advance to step 2", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: "I'm following" })
      .click({ timeout: 10000 });

    // Now shows the race picker step
    await expect(
      page.getByRole("heading", { name: "Pick a race" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Which race are you watching?")).toBeVisible();
  });

  test("step 2 — should show code input and Follow button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "I'm following" }).click();

    // Pick a race to advance to the code entry step
    await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
    await page.locator(".choice-btn").first().click();

    const input = page.locator("input.code-input");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    const confirmBtn = page.getByRole("button", { name: "Follow" });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();
  });

  test("step 2 — Follow button enables after typing 6 characters", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "I'm following" }).click();

    // Pick a race to advance to the code entry step
    await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
    await page.locator(".choice-btn").first().click();

    const input = page.locator("input.code-input");
    const confirmBtn = page.getByRole("button", { name: "Follow" });

    await input.fill("A3K7");
    await expect(confirmBtn).toBeDisabled();

    await input.fill("A3K7X2");
    await expect(confirmBtn).toBeEnabled();
  });

  test("step 2 — input is uppercased automatically", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "I'm following" }).click();

    // Pick a race to advance to the code entry step
    await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
    await page.locator(".choice-btn").first().click();

    const input = page.locator("input.code-input");
    await input.fill("a3k7x2");

    await expect(input).toHaveValue("A3K7X2");
  });

  test("step 2 — back button returns to step 1", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "I'm following" }).click();
    await expect(
      page.getByRole("heading", { name: "Pick a race" }),
    ).toBeVisible({ timeout: 10000 });

    // Back from the race picker (step 3) returns to step 1
    await page.getByRole("button", { name: /Back/ }).click();

    await expect(page.getByText("What are you doing today?")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pick a race" }),
    ).not.toBeVisible();
  });

  test("step 2 — pressing Enter submits a valid code", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "I'm following" }).click();

    // Pick a race to advance to the code entry step
    await page.locator(".choice-btn").first().waitFor({ timeout: 10000 });
    await page.locator(".choice-btn").first().click();

    const input = page.locator("input.code-input");
    await input.fill("A3K7X2");
    await input.press("Enter");

    // Wizard is dismissed — canvas or follower UI should appear
    await expect(page.getByText("Enter Room Code")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should load without JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page.getByRole("button", { name: "I'm running" })).toBeVisible(
      { timeout: 10000 },
    );

    expect(errors).toEqual([]);
  });
});
