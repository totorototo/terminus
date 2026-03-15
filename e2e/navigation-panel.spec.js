/**
 * Navigation panel e2e tests.
 *
 * The top sheet shows remaining sections as a scrolling list. Each section row
 * has .distance-value, .distance-unit, .waypoint, .elevation-item.gain/.loss.
 * The first (current) section has the class "current".
 *
 * All selectors are scoped with .first() or to .section.current to avoid
 * strict-mode violations when multiple sections are rendered at once.
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

// Mid-trail position (~50% of vvx-xgtv-2026.gpx)
const MID_TRAIL = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

const kmLeft = (page) =>
  page
    .locator(".stat-item", { has: page.getByText("km left") })
    .locator(".stat-value");

/**
 * Returns a locator scoped to the current section in the navigation panel.
 * The panel may render many sections; the first one is marked .current.
 */
const currentSection = (panel) => panel.locator(".section.current");

test.describe("Navigation Panel", () => {
  test.describe("Structure", () => {
    test("navigation panel region is visible after load", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await expect(
        page.getByRole("region", { name: /Navigation panel/i }),
      ).toBeVisible();
    });

    test("at least one section is rendered after GPX loads", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const panel = page.getByRole("region", { name: /Navigation panel/i });

      // Wait for GPX to finish — sections appear once cumulativeDistances exist
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });
      const count = await panel.locator(".section").count();
      expect(count).toBeGreaterThan(0);
    });

    test("current section has a numeric distance value", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const panel = page.getByRole("region", { name: /Navigation panel/i });
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });

      const section = currentSection(panel);
      await expect(section.locator(".distance-value")).toContainText(/\d/);
    });

    test("current section contains a 'km' unit", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const panel = page.getByRole("region", { name: /Navigation panel/i });
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });

      const section = currentSection(panel);
      await expect(section.locator(".distance-unit")).toHaveText("km");
    });

    test("current section has a non-empty waypoint name", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const panel = page.getByRole("region", { name: /Navigation panel/i });
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });

      const waypoint = currentSection(panel).locator(".waypoint");
      await expect(waypoint).toBeVisible();
      const text = await waypoint.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    });

    test("current section has elevation gain and loss elements", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const panel = page.getByRole("region", { name: /Navigation panel/i });
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });

      const section = currentSection(panel);
      await expect(section.locator(".elevation-item.gain")).toBeVisible();
      await expect(section.locator(".elevation-item.loss")).toBeVisible();
    });

    test("elevation items contain numeric content", async ({ page }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const panel = page.getByRole("region", { name: /Navigation panel/i });
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });

      const section = currentSection(panel);
      const gainText = await section
        .locator(".elevation-item.gain")
        .textContent();
      const lossText = await section
        .locator(".elevation-item.loss")
        .textContent();

      expect(gainText).toMatch(/\d/);
      expect(lossText).toMatch(/\d/);
    });

    test("no undefined or null values in navigation panel", async ({
      page,
    }) => {
      await page.goto("/");
      await selectRunnerRole(page);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      const panel = page.getByRole("region", { name: /Navigation panel/i });
      await expect(panel.locator(".section").first()).toBeVisible({
        timeout: 30_000,
      });

      const text = await panel.textContent();
      expect(text).not.toContain("undefined");
      expect(text).not.toContain("null");
      expect(text).not.toContain("NaN");
    });
  });

  test.describe("With GPS location", () => {
    test("current section distance value is valid after GPS fix", async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        geolocation: MID_TRAIL,
        permissions: ["geolocation"],
      });

      try {
        const page = await ctx.newPage();
        await page.goto("/");
        await selectRunnerRole(page);

        // Wait for GPX to load
        await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

        const panel = page.getByRole("region", { name: /Navigation panel/i });
        await expect(panel.locator(".section").first()).toBeVisible({
          timeout: 30_000,
        });

        // Project GPS onto trail
        await page
          .getByRole("button", { name: /find my current location/i })
          .click();

        await page.waitForTimeout(2000);

        const section = currentSection(panel);
        await expect(section.locator(".distance-value")).toContainText(/\d/);

        const text = await section.locator(".distance-value").textContent();
        expect(text).not.toContain("undefined");
      } finally {
        await ctx.close();
      }
    });

    test("navigation panel stays visible after GPS projection", async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        geolocation: MID_TRAIL,
        permissions: ["geolocation"],
      });

      try {
        const page = await ctx.newPage();
        await page.goto("/");
        await selectRunnerRole(page);

        await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

        await page
          .getByRole("button", { name: /find my current location/i })
          .click();

        await page.waitForTimeout(2000);

        await expect(
          page.getByRole("region", { name: /Navigation panel/i }),
        ).toBeVisible();
      } finally {
        await ctx.close();
      }
    });

    test("no JS errors during GPS updates", async ({ browser }) => {
      const ctx = await browser.newContext({
        geolocation: MID_TRAIL,
        permissions: ["geolocation"],
      });

      try {
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (err) => errors.push(err.message));

        await page.goto("/");
        await selectRunnerRole(page);

        await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

        await page
          .getByRole("button", { name: /find my current location/i })
          .click();

        await page.waitForTimeout(2000);
        expect(errors).toEqual([]);
      } finally {
        await ctx.close();
      }
    });
  });
});
