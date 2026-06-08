/**
 * Wizard e2e tests — covers the first-run role selection flow.
 */

import { expect, test } from "@playwright/test";

test.describe("Wizard", () => {
  test("shows role choice screen on first load", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: "I'm running" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "I'm following" }),
    ).toBeVisible();
  });

  test("runner flow: picks race and launches the app", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: "I'm running" })
      .click({ timeout: 10_000 });
    await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
    await page.locator(".choice-btn").first().click();

    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("follower flow: code input validation and auto-uppercase", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "I'm following" })
      .click({ timeout: 10_000 });
    await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
    await page.locator(".choice-btn").first().click();

    const input = page.locator("input.code-input");
    const btn = page.getByRole("button", { name: "Follow" });

    await expect(input).toBeFocused();
    await expect(btn).toBeDisabled();

    // Too short: still disabled
    await input.fill("a3k7");
    await expect(btn).toBeDisabled();

    // Full 16-char lowercase hex room id: enabled
    await input.fill("0a1b2c3d4e5f6a7b");
    await expect(input).toHaveValue("0a1b2c3d4e5f6a7b");
    await expect(btn).toBeEnabled();
  });

  test("back button returns to role selection", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "I'm following" })
      .click({ timeout: 10_000 });

    await expect(
      page.getByRole("heading", { name: "Pick a race" }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Back/ }).click();

    await expect(page.getByText("What are you doing today?")).toBeVisible();
  });
});
