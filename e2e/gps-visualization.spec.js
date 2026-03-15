/**
 * GPS visualization e2e tests.
 *
 * Uses Playwright's geolocation injection (same approach as location-sharing.spec.js)
 * to simulate a runner on the trail and verifies that:
 *  - Stats update after "Find my current location" is clicked
 *  - A second GPS fix updates stats again
 *  - Rapid successive location updates don't produce errors or stale values
 *  - An off-trail position is handled without crashing
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

// Mid-trail position (~50% of vvx-xgtv-2026.gpx)
const MID_TRAIL = { latitude: 45.4982, longitude: 2.9089, accuracy: 10 };

// A point near the start of the trail (low distance remaining)
const NEAR_START = { latitude: 45.1937, longitude: 2.7541, accuracy: 10 };

// A position far away from the trail (Eiffel Tower)
const OFF_TRAIL = { latitude: 48.8584, longitude: 2.2945, accuracy: 10 };

const kmLeft = (page) =>
  page
    .locator(".stat-item", { has: page.getByText("km left") })
    .locator(".stat-value");

test.describe("GPS Visualization", () => {
  test("stats become non-zero after spotting location on trail", async ({
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
      const fullDistance = parseFloat(await kmLeft(page).textContent());

      // Project location
      await page
        .getByRole("button", { name: /find my current location/i })
        .click();

      // km-left decreases from full distance (we're at ~50% of trail)
      await expect
        .poll(async () => parseFloat(await kmLeft(page).textContent()), {
          timeout: 15_000,
        })
        .toBeLessThan(fullDistance);

      // Value is still a valid decimal number
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/);
    } finally {
      await ctx.close();
    }
  });

  test("second GPS fix updates km-left", async ({ browser }) => {
    // Start at mid-trail then move to near-start, so km-left should increase
    // (more of the trail ahead when snapping to start vs middle).
    // We use setGeolocation between clicks.
    const ctx = await browser.newContext({
      geolocation: MID_TRAIL,
      permissions: ["geolocation"],
    });

    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

      // First fix at mid-trail
      await page
        .getByRole("button", { name: /find my current location/i })
        .click();

      await expect
        .poll(async () => parseFloat(await kmLeft(page).textContent()), {
          timeout: 15_000,
        })
        .toBeGreaterThan(0);

      const kmAfterFirst = parseFloat(await kmLeft(page).textContent());

      // Move GPS to near start (more trail remaining ahead)
      await ctx.setGeolocation(NEAR_START);

      // Second fix
      await page
        .getByRole("button", { name: /find my current location/i })
        .click();

      await expect
        .poll(async () => parseFloat(await kmLeft(page).textContent()), {
          timeout: 15_000,
        })
        .not.toBe(kmAfterFirst);

      // The updated value is still a well-formed number
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/);
    } finally {
      await ctx.close();
    }
  });

  test("rapid GPS updates do not produce JS errors", async ({ browser }) => {
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

      // Fire 5 location projections in quick succession
      for (let i = 0; i < 5; i++) {
        await page
          .getByRole("button", { name: /find my current location/i })
          .click();
        // Small gap to let the worker process each message
        await page.waitForTimeout(200);
      }

      // Final value still valid
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 10_000 });

      expect(errors).toEqual([]);
    } finally {
      await ctx.close();
    }
  });

  test("off-trail position does not crash the app", async ({ browser }) => {
    const ctx = await browser.newContext({
      geolocation: OFF_TRAIL,
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

      // Give the app time to process the off-trail position
      await page.waitForTimeout(2000);

      // Canvas still visible — app not crashed
      await expect(page.locator("canvas").first()).toBeVisible();

      // km-left is still a valid number (may be full distance or projected)
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/);

      expect(errors).toEqual([]);
    } finally {
      await ctx.close();
    }
  });

  test("UI panels remain visible after GPS projection", async ({ browser }) => {
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

      await expect
        .poll(async () => parseFloat(await kmLeft(page).textContent()), {
          timeout: 15_000,
        })
        .toBeGreaterThan(0);

      // Both panels still present
      await expect(
        page.getByRole("region", { name: /Navigation panel/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: /Trail data panel/i }),
      ).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("stat values contain no undefined or null after GPS fix", async ({
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

      // Wait for stats to update
      await page.waitForTimeout(2000);

      const statValues = page.locator(".stat-value");
      const count = await statValues.count();
      expect(count).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < count; i++) {
        const text = await statValues.nth(i).textContent();
        expect(text).not.toContain("undefined");
        expect(text).not.toContain("null");
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    } finally {
      await ctx.close();
    }
  });
});
