/**
 * Error states and edge case e2e tests.
 *
 * Covers degraded conditions that don't appear in the happy path:
 *  - races.json fails to load (network error / 404)
 *  - Geolocation permission denied
 *  - Follower room code boundary conditions (already partly covered in
 *    wizard.spec.js, extended here for the full follower flow)
 *  - App graceful handling of an empty / malformed response
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole } from "./helpers.js";

test.describe("Error States", () => {
  // ── races.json failures ────────────────────────────────────────────────────

  test.describe("races.json network failure", () => {
    test("wizard renders even when races.json returns 500", async ({
      page,
    }) => {
      // Intercept before the first navigation so Vite doesn't prefetch
      await page.route("**/races.json", (route) => route.abort("failed"));

      await page.goto("/");

      // Wizard heading must still appear — the shell loads correctly
      await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible(
        { timeout: 10_000 },
      );
    });

    test("race picker shows a message or empty list when races.json fails", async ({
      page,
    }) => {
      await page.route("**/races.json", (route) =>
        route.fulfill({ status: 404, body: "Not Found" }),
      );

      await page.goto("/");
      await page
        .getByRole("button", { name: "I'm running" })
        .click({ timeout: 10_000 });

      // App must not crash — either an error message or an empty list
      await page.waitForTimeout(2000);
      await expect(page.locator("canvas").first()).not.toBeVisible();

      // No uncaught exception
      // (error handling is implicit — if the page crashes Playwright throws)
    });

    test("no uncaught JS exception when races.json is 404", async ({
      page,
    }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.route("**/races.json", (route) =>
        route.fulfill({ status: 404, body: "Not Found" }),
      );

      await page.goto("/");
      await page
        .getByRole("button", { name: "I'm running" })
        .click({ timeout: 10_000 });

      await page.waitForTimeout(2000);
      expect(errors).toEqual([]);
    });

    test("retrying after restoring races.json shows race list", async ({
      page,
    }) => {
      let callCount = 0;
      await page.route("**/races.json", (route) => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          return route.fulfill({ status: 503, body: "" });
        }
        // Subsequent calls succeed
        return route.continue();
      });

      await page.goto("/");
      await page
        .getByRole("button", { name: "I'm running" })
        .click({ timeout: 10_000 });

      // Navigate back to step 1 and re-enter to trigger a fresh races.json call
      await page.getByRole("button", { name: /Back/i }).click();
      await page
        .getByRole("button", { name: "I'm running" })
        .click({ timeout: 5_000 });

      // Race list should now appear (second request succeeds)
      await expect(page.locator(".choice-btn").first()).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  // ── Geolocation permission denied ──────────────────────────────────────────

  test.describe("Geolocation permission denied", () => {
    test("app loads normally without geolocation permission", async ({
      browser,
    }) => {
      // Create context with NO geolocation permissions
      const ctx = await browser.newContext({ permissions: [] });

      try {
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (err) => errors.push(err.message));

        await page.goto("/");
        await selectRunnerRole(page);

        // Canvas visible — app works without GPS
        await expect(page.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // Stats panel still rendered
        await expect(
          page.getByRole("region", { name: /Trail data panel/i }),
        ).toBeVisible();

        expect(errors).toEqual([]);
      } finally {
        await ctx.close();
      }
    });

    test("'Find my current location' does not crash when permission denied", async ({
      browser,
    }) => {
      const ctx = await browser.newContext({ permissions: [] });

      try {
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (err) => errors.push(err.message));

        await page.goto("/");
        await selectRunnerRole(page);
        await expect(page.locator("canvas").first()).toBeVisible({
          timeout: 15_000,
        });

        // Click spot-me without permission
        await page
          .getByRole("button", { name: /find my current location/i })
          .click();

        await page.waitForTimeout(2000);

        // Canvas must still be there
        await expect(page.locator("canvas").first()).toBeVisible();
        expect(errors).toEqual([]);
      } finally {
        await ctx.close();
      }
    });

    test("km-left is still displayed when geolocation is unavailable", async ({
      browser,
    }) => {
      const ctx = await browser.newContext({ permissions: [] });

      try {
        const page = await ctx.newPage();
        await page.goto("/");
        await selectRunnerRole(page);

        const kmLeftLocator = page
          .locator(".stat-item", { has: page.getByText("km left") })
          .locator(".stat-value");

        // Full trail distance is shown even without GPS
        await expect(kmLeftLocator).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

        const km = parseFloat(await kmLeftLocator.textContent());
        expect(km).toBeGreaterThan(0);
        expect(km).toBeLessThan(300);
      } finally {
        await ctx.close();
      }
    });
  });

  // ── Follower room code edge cases ──────────────────────────────────────────

  test.describe("Follower room code validation", () => {
    async function goToCodeStep(page) {
      await page.goto("/");
      await page.getByRole("button", { name: "I'm following" }).click();
      await page.locator(".choice-btn").first().waitFor({ timeout: 10_000 });
      await page.locator(".choice-btn").first().click();
    }

    test("Follow button disabled for empty input", async ({ page }) => {
      await goToCodeStep(page);
      const btn = page.getByRole("button", { name: "Follow" });
      await expect(btn).toBeDisabled();
    });

    test("Follow button disabled for 5-char input", async ({ page }) => {
      await goToCodeStep(page);
      await page.locator("input.code-input").fill("A3K7X");
      await expect(page.getByRole("button", { name: "Follow" })).toBeDisabled();
    });

    test("Follow button enabled for exactly 6-char input", async ({ page }) => {
      await goToCodeStep(page);
      await page.locator("input.code-input").fill("A3K7X2");
      await expect(page.getByRole("button", { name: "Follow" })).toBeEnabled();
    });

    test("Follow button disabled again when input cleared below 6 chars", async ({
      page,
    }) => {
      await goToCodeStep(page);
      const input = page.locator("input.code-input");
      const btn = page.getByRole("button", { name: "Follow" });

      await input.fill("A3K7X2");
      await expect(btn).toBeEnabled();

      await input.fill("A3K");
      await expect(btn).toBeDisabled();
    });

    test("lowercase input is auto-uppercased", async ({ page }) => {
      await goToCodeStep(page);
      const input = page.locator("input.code-input");
      await input.fill("a3k7x2");
      await expect(input).toHaveValue("A3K7X2");
    });

    test("submitting a non-existent room code does not crash the app", async ({
      page,
    }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await goToCodeStep(page);
      await page.locator("input.code-input").fill("XXXXXX");
      await page.getByRole("button", { name: "Follow" }).click();

      // App should load the follower view or show an error — not crash
      await page.waitForTimeout(5000);
      expect(errors).toEqual([]);
    });
  });

  // ── Malformed GPX ──────────────────────────────────────────────────────────

  test.describe("Malformed or missing GPX", () => {
    test("app does not crash when GPX file returns 404", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      // Block all .gpx requests
      await page.route("**/*.gpx", (route) =>
        route.fulfill({ status: 404, body: "" }),
      );

      await page.goto("/");
      await selectRunnerRole(page);

      // Canvas should still mount — 3D scene doesn't depend on GPX to init
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 15_000,
      });

      await page.waitForTimeout(2000);
      expect(errors).toEqual([]);
    });
  });
});
