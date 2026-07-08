/**
 * Live GPS tracking e2e tests.
 *
 * Verifies that "Find my current location" updates trail stats and handles
 * edge cases (second fix at a different position, off-trail position).
 */

import { expect, test } from "@playwright/test";

import {
  autoShareBtn,
  kmLeft,
  MID_TRAIL,
  mockClipboard,
  NEAR_START,
  OFF_TRAIL,
  selectRunnerRole,
} from "./helpers.js";

test.describe("Live GPS Tracking", () => {
  test.describe("mid-trail fix", () => {
    test.use({ geolocation: MID_TRAIL, permissions: ["geolocation"] });

    test("GPS fix updates km-left to a different value", async ({ page }) => {
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
    });

    test("second GPS fix reflects the new position", async ({
      page,
      context,
    }) => {
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
      await context.setGeolocation(NEAR_START);
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
    });
  });

  test.describe("off-trail fix", () => {
    test.use({ geolocation: OFF_TRAIL, permissions: ["geolocation"] });

    test("off-trail position does not crash the app", async ({ page }) => {
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
    });
  });
});
