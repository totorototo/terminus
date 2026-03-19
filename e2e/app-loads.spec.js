/**
 * Smoke tests — verify the app boots correctly and key UI is present.
 *
 * Covers both layout paths:
 *  - Mobile  (< 993 px) — TopSheetPanel + BottomSheetPanel
 *  - Desktop (≥ 993 px) — DesktopLayout aside panel
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

test.describe("Smoke", () => {
  test("wizard loads without JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("What are you doing today?")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("mobile: runner flow loads 3D canvas and sheet panels", async ({
    page,
  }) => {
    await page.goto("/");
    await selectRunnerRole(page); // forces 390×844

    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("region", { name: /Navigation panel/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: /Trail data panel/i }),
    ).toBeVisible();
  });

  test("desktop: runner flow loads 3D canvas and desktop layout panel", async ({
    page,
  }) => {
    // Use a viewport above the 993 px breakpoint to activate DesktopLayout.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await page
      .getByRole("button", { name: "I'm running" })
      .click({ timeout: 10_000 });
    await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
    await page.locator(".choice-btn").first().click();

    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });

    // DesktopLayout renders TrailOverview — its unique header class confirms
    // the desktop code path is active (mobile renders it inside a bottom sheet).
    await expect(page.locator(".overview-header")).toBeVisible();

    // Mobile sheet panels must NOT be present in desktop mode
    await expect(
      page.getByRole("region", { name: /Trail data panel/i }),
    ).not.toBeVisible();
  });
});
