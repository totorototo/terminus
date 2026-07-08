/**
 * Navigation panel e2e tests.
 *
 * The top sheet shows remaining sections as a scrolling list. Each section row
 * has distance, waypoint name, and elevation gain/loss. The first (current)
 * section has the class "current".
 */

import { expect, test } from "@playwright/test";

import {
  kmLeft,
  MID_TRAIL,
  mockClipboard,
  selectRunnerRole,
} from "./helpers.js";

test.describe("Navigation Panel", () => {
  test("shows sections with distance, waypoint and elevation after GPX loads", async ({
    page,
  }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });

    const panel = page.getByRole("region", { name: /Navigation panel/i });
    await expect(panel).toBeVisible();

    // Wait for GPX processing — sections appear once route data is ready
    await expect(panel.locator(".section").first()).toBeVisible({
      timeout: 30_000,
    });

    const current = panel.locator(".section.current");
    await expect(current.locator(".distance-value")).toContainText(/\d/);
    await expect(current.locator(".distance-unit")).toHaveText("km");
    await expect(current.locator(".waypoint")).not.toBeEmpty();
    await expect(current.locator(".elevation-item.gain")).toContainText(/\d/);
    await expect(current.locator(".elevation-item.loss")).toContainText(/\d/);
  });

  test.describe("GPS projection", () => {
    test.use({ geolocation: MID_TRAIL, permissions: ["geolocation"] });

    test("GPS projection updates the current section distance", async ({
      page,
    }) => {
      await mockClipboard(page);
      await page.goto("/");
      await selectRunnerRole(page);

      // Wait for GPX to finish loading
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

      const panel = page.getByRole("region", { name: /Navigation panel/i });
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });

      // Capture the distance before projecting so we can verify it changes
      const distanceBefore = await panel
        .locator(".section.current .distance-value")
        .textContent();

      await page.getByRole("button", { name: /auto-share location/i }).click();

      // Poll until the distance value changes — no arbitrary sleep
      await expect
        .poll(
          () => panel.locator(".section.current .distance-value").textContent(),
          { timeout: 15_000 },
        )
        .not.toBe(distanceBefore);

      // Value must be a valid number, not a broken render
      const distanceAfter = await panel
        .locator(".section.current .distance-value")
        .textContent();
      expect(distanceAfter).toMatch(/\d/);
      expect(distanceAfter).not.toContain("undefined");

      // Panel must remain visible after the GPS update
      await expect(panel).toBeVisible();
    });
  });
});
