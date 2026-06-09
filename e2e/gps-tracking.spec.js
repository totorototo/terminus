/**
 * Live GPS tracking e2e tests.
 *
 * Verifies that "Find my current location" updates trail stats and handles
 * edge cases (second fix at a different position, off-trail position).
 */

import { expect, test } from "@playwright/test";

import {
  MID_TRAIL,
  mockClipboard,
  NEAR_START,
  OFF_TRAIL,
  selectRunnerRole,
} from "./helpers.js";

const autoShareBtn = (page) =>
  page.getByRole("button", { name: /auto-share location/i });

const kmLeft = (page) =>
  page
    .locator(".stat-item", { has: page.getByText("km left") })
    .locator(".stat-value");

test.describe("Live GPS Tracking", () => {
  test("GPS fix updates km-left to a different value", async ({ browser }) => {
    const ctx = await browser.newContext({
      geolocation: MID_TRAIL,
      permissions: ["geolocation"],
    });
    try {
      const page = await ctx.newPage();
      await mockClipboard(page);
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });
      const before = parseFloat(await kmLeft(page).textContent());

      await autoShareBtn(page).click();

      // Value must change — not just be non-zero (which it already was)
      await expect
        .poll(async () => parseFloat(await kmLeft(page).textContent()), {
          timeout: 15_000,
        })
        .not.toBe(before);
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/);
    } finally {
      await ctx.close();
    }
  });

  test("second GPS fix reflects the new position", async ({ browser }) => {
    const ctx = await browser.newContext({
      geolocation: MID_TRAIL,
      permissions: ["geolocation"],
    });
    try {
      const page = await ctx.newPage();
      await mockClipboard(page);
      await page.goto("/");
      await selectRunnerRole(page);

      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

      // First fix at mid-trail — enables auto-share and does an immediate spotMe
      await autoShareBtn(page).click();
      const initialKm = parseFloat(await kmLeft(page).textContent());
      await expect
        .poll(async () => parseFloat(await kmLeft(page).textContent()), {
          timeout: 15_000,
        })
        .not.toBe(initialKm);
      const kmAfterFirst = parseFloat(await kmLeft(page).textContent());

      // Move GPS to near start, disable then re-enable to trigger a new fix
      await ctx.setGeolocation(NEAR_START);
      await page
        .getByRole("button", { name: /stop auto-sharing location/i })
        .click();
      await autoShareBtn(page).click();

      await expect
        .poll(async () => parseFloat(await kmLeft(page).textContent()), {
          timeout: 15_000,
        })
        .not.toBe(kmAfterFirst);
      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/);
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
      await mockClipboard(page);
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/");
      await selectRunnerRole(page);

      await expect(kmLeft(page)).toHaveText(/^\d+\.\d/, { timeout: 30_000 });

      await autoShareBtn(page).click();

      // Poll until the stat stabilises rather than sleeping
      await expect
        .poll(async () => kmLeft(page).textContent(), { timeout: 10_000 })
        .toMatch(/^\d+\.\d/);

      await expect(page.locator("canvas").first()).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await ctx.close();
    }
  });
});
