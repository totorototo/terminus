/**
 * Story section e2e tests — static data checks for the scroll-driven story.
 *
 * All sections render in the DOM regardless of scroll position (revealed via
 * IntersectionObserver + opacity/transform, not mount/unmount), so assertions
 * work without programmatic scrolling.
 *
 *   StoryHero        — route name, distance, elevation gain/loss, est. time
 *   StoryNow         — live km-left / eta / remaining (pre-GPS-fix baseline)
 *   StoryClimbs      — detected climbs with count and per-climb stats
 *   StoryStages      — milestones: start, life bases, finish
 *   StoryCheckpoints — every checkpoint with distance/eta/cutoff
 *
 * Live GPS updates are covered separately in gps-tracking.spec.js.
 */

import { expect, test } from "@playwright/test";

import { heroDistanceKm, kmLeft, selectRunnerRole } from "./helpers.js";

test.describe("Story Sections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
    // Wait for the GPX route to finish loading — sections/stages/checkpoints
    // all depend on the same pipeline as the hero's distance stat.
    await expect(heroDistanceKm(page)).not.toHaveText("0.0", {
      timeout: 30_000,
    });
  });

  // ── StoryHero ────────────────────────────────────────────────────────────

  test("Hero: shows total distance, elevation gain/loss, and est. time", async ({
    page,
  }) => {
    const stats = page.locator(".stat-row .stat");
    await expect(stats).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(stats.nth(i).locator(".stat-value")).toContainText(/\d/);
    }
  });

  // ── StoryNow ─────────────────────────────────────────────────────────────

  test("Right now: shows a baseline km-left / eta / remaining before any GPS fix", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Where you are" }),
    ).toBeVisible();
    await expect(kmLeft(page)).toHaveText("0");
    await expect(
      page
        .locator(".now-stat", { has: page.getByText("eta") })
        .locator(".now-value"),
    ).toHaveText("--:--");
  });

  // ── StoryClimbs ──────────────────────────────────────────────────────────

  test("Climbs: shows a non-zero climb count and at least one climb row", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /^\d+ climbs$/ }),
    ).toBeVisible();
    await expect(page.locator(".climb-row").first()).toBeVisible();
  });

  // ── StoryStages ──────────────────────────────────────────────────────────

  test("Stages: shows the finish as the last milestone with data", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Milestones" }),
    ).toBeVisible();
    const lastStage = page.locator(".stage-row").last();
    await expect(lastStage).toBeVisible();
    await expect(
      lastStage.locator(".stage-stats-grid .stat-value").first(),
    ).toContainText(/\d/);
  });

  // ── StoryCheckpoints ─────────────────────────────────────────────────────

  test("Checkpoints: shows a checkpoint list with distance and eta data", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Checkpoints" }),
    ).toBeVisible();
    const firstCheckpoint = page.locator(".checkpoint-row").first();
    await expect(firstCheckpoint).toBeVisible();
    await expect(firstCheckpoint.locator(".checkpoint-km")).toContainText(/\d/);
    await expect(
      firstCheckpoint.locator(".checkpoint-stats-grid .stat-value").first(),
    ).toContainText(/\d/);
  });
});
