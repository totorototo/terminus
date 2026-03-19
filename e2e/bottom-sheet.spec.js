/**
 * Bottom sheet panel e2e tests.
 *
 * The bottom sheet is a horizontal-scroll carousel that exposes multiple
 * analytics views once the GPX route has been processed:
 *
 *   TrailOverview    — total distance, elevation gain/loss
 *   TrailProgression — cumulative progress percentage
 *   StageAnalytics   — per-stage distance, elevation, difficulty
 *   SectionAnalytics — per-section distance, elevation, difficulty
 *   PeakSummary      — detected climbs with count and per-climb stats
 *
 * All components are rendered in the DOM regardless of scroll position,
 * so assertions work without programmatic scrolling.
 */

import { test, expect } from "@playwright/test";
import { selectRunnerRole, MID_TRAIL } from "./helpers.js";

/** Wait for the GPX route to finish loading (km-left stat populated). */
async function waitForGpx(page) {
  await expect(
    page
      .locator(".stat-item", { has: page.getByText("km left") })
      .locator(".stat-value"),
  ).toHaveText(/^\d+\.\d/, { timeout: 30_000 });
}

// ── Static data tests (no GPS needed) ────────────────────────────────────────

test.describe("Bottom Sheet Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15_000,
    });
    await waitForGpx(page);
  });

  // ── TrailOverview ──────────────────────────────────────────────────────────

  test("TrailOverview: shows total distance and elevation gain/loss", async ({
    page,
  }) => {
    await expect(page.locator(".overview-header")).toBeVisible();

    // Distance tile — .first() scopes to TrailOverview (appears before Stage/Section)
    const distanceTile = page
      .locator(".grid-tile", { has: page.getByText("Distance") })
      .first();
    await expect(distanceTile.locator(".tile-value")).toContainText(/\d/);

    const gainTile = page
      .locator(".grid-tile", { has: page.getByText("Gain") })
      .first();
    await expect(gainTile.locator(".tile-value")).toContainText(/\d/);
  });

  // ── TrailProgression ───────────────────────────────────────────────────────

  test("TrailProgression: shows 0% progress before GPS fix", async ({
    page,
  }) => {
    await expect(page.locator(".progression-header")).toBeVisible();
    await expect(page.locator(".progression-value").first()).toHaveText("0%");
  });

  // ── StageAnalytics ─────────────────────────────────────────────────────────

  test("StageAnalytics: shows stage route and distance data", async ({
    page,
  }) => {
    const stageHeader = page
      .locator(".analytics-header")
      .filter({ has: page.locator(".header-label", { hasText: "Stage" }) });
    await expect(stageHeader.first()).toBeVisible();

    // Route must be non-empty (start → end), not an empty state
    const routeText = await stageHeader
      .first()
      .locator(".header-route")
      .textContent();
    expect(routeText?.trim().length).toBeGreaterThan(0);

    // At least one data tile must contain a digit — confirms data loaded, not empty state
    const stageTiles = stageHeader
      .first()
      .locator("..")
      .locator(".grid-tile .tile-value");
    const firstTileText = await stageTiles.first().textContent();
    expect(firstTileText).toMatch(/\d/);
  });

  // ── SectionAnalytics ───────────────────────────────────────────────────────

  test("SectionAnalytics: shows section route and distance data", async ({
    page,
  }) => {
    const sectionHeader = page
      .locator(".analytics-header")
      .filter({ has: page.locator(".header-label", { hasText: "Section" }) });
    await expect(sectionHeader.first()).toBeVisible();

    // Route must be non-empty, not an empty state
    const routeText = await sectionHeader
      .first()
      .locator(".header-route")
      .textContent();
    expect(routeText?.trim().length).toBeGreaterThan(0);

    // At least one data tile must contain a digit
    const sectionTiles = sectionHeader
      .first()
      .locator("..")
      .locator(".grid-tile .tile-value");
    const firstTileText = await sectionTiles.first().textContent();
    expect(firstTileText).toMatch(/\d/);
  });

  // ── PeakSummary (Climbs) ───────────────────────────────────────────────────

  test("PeakSummary: shows climbs list with a non-zero count", async ({
    page,
  }) => {
    await expect(
      page
        .locator(".list-header .header-label")
        .filter({ hasText: "Climbs" })
        .first(),
    ).toBeVisible();

    const countText = await page
      .locator(".list-header .header-count")
      .first()
      .textContent();
    expect(parseInt(countText)).toBeGreaterThan(0);

    // At least one climb row rendered
    await expect(page.locator(".climb-row").first()).toBeVisible();
  });
});

// ── GPS-dependent test (own context, no wasted beforeEach) ───────────────────

test("TrailProgression: updates after GPS fix", async ({ browser }) => {
  const ctx = await browser.newContext({
    geolocation: MID_TRAIL,
    permissions: ["geolocation"],
  });
  try {
    const page = await ctx.newPage();
    await page.goto("/");
    await selectRunnerRole(page);
    await waitForGpx(page);

    await page
      .getByRole("button", { name: /find my current location/i })
      .click();

    await expect(page.locator(".progression-value").first()).not.toHaveText(
      "0%",
      { timeout: 15_000 },
    );
    await expect(page.locator(".progression-value").first()).toHaveText(
      /^\d+%$/,
    );
  } finally {
    await ctx.close();
  }
});
