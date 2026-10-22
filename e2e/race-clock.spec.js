/**
 * Race clock e2e tests — times read on the race's clock, wherever the device is.
 *
 * grp-160-2026.gpx's waypoints carry Waymark's +02:00 offset: the Restaurant
 * Merlans cutoff is 08:30 race time (06:30Z). A device in New York must still
 * read 08:30, with a note naming the race's clock; one in the race's zone reads
 * the same times with no note.
 */

import { expect, heroDistanceKm, selectRunnerRole, test } from "./helpers.js";

const NOTE = "Times on the race's clock (UTC+2).";

const merlansCutoff = (page) =>
  page
    .locator(".checkpoint-row", { hasText: "Restaurant Merlans" })
    .first()
    .locator(".checkpoint-figures dd")
    .first();

async function openStory(page) {
  await page.goto("/");
  await selectRunnerRole(page);
  await expect(heroDistanceKm(page)).not.toHaveText("0.0", {
    timeout: 30_000,
  });
}

test.describe("Race clock, device abroad", () => {
  test.use({ timezoneId: "America/New_York" });

  test("Checkpoints: cutoffs read on the race's clock, with a note", async ({
    page,
  }) => {
    await openStory(page);
    await expect(page.getByText(NOTE).first()).toBeVisible();
    await expect(merlansCutoff(page)).toHaveText(/08:30$/);
  });
});

test.describe("Race clock, device in the race's zone", () => {
  test.use({ timezoneId: "Europe/Paris" });

  test("Checkpoints: the same cutoffs, no note", async ({ page }) => {
    await openStory(page);
    await expect(merlansCutoff(page)).toHaveText(/08:30$/);
    await expect(page.getByText(NOTE)).toHaveCount(0);
  });
});
