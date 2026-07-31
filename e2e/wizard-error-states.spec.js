/**
 * Wizard e2e tests — error/recovery states.
 *
 * Covers the /races.json load failure path: the wizard shows a "Could not
 * load races." message with a "Try again" button, and retrying re-fetches
 * and recovers once the network call succeeds.
 */

import { expect, test } from "@playwright/test";

// Block the service worker so its own cache-first fetch handling for
// /races.json can't shadow the network failures simulated below via page.route.
test.use({ serviceWorkers: "block" });

test.describe("Wizard — error states", () => {
  test("shows a retry option when races.json fails to load, and recovers on retry", async ({
    page,
  }) => {
    // Keep failing until the test explicitly allows recovery — a plain
    // "fail once" counter races against the wizard's own retry-on-next-click
    // behavior (retryIfNeeded), which can silently succeed before the
    // assertions below ever observe the error state.
    let shouldFail = true;
    await page.route("**/races.json", (route) => {
      if (shouldFail) {
        return route.fulfill({ status: 500, body: "Internal Server Error" });
      }
      return route.continue();
    });

    await page.goto("/");
    await page
      .getByRole("button", { name: "I'm running" })
      .click({ timeout: 10_000 });

    await expect(page.getByText("Could not load races.")).toBeVisible({
      timeout: 10_000,
    });
    const retryBtn = page.getByRole("button", { name: "Try again" });
    await expect(retryBtn).toBeVisible();

    shouldFail = false;
    await retryBtn.click();

    await expect(page.locator(".choice-btn").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("follower flow also recovers from a races.json failure", async ({
    page,
  }) => {
    let shouldFail = true;
    await page.route("**/races.json", (route) => {
      if (shouldFail) {
        return route.fulfill({ status: 500, body: "Internal Server Error" });
      }
      return route.continue();
    });

    await page.goto("/");
    await page
      .getByRole("button", { name: "I'm following" })
      .click({ timeout: 10_000 });

    const retryBtn = page.getByRole("button", { name: "Try again" });
    await expect(retryBtn).toBeVisible({ timeout: 10_000 });

    shouldFail = false;
    await retryBtn.click();

    await expect(page.locator(".choice-btn").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
