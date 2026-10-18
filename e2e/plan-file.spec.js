/**
 * plan.json from Regimen: its model replaces the pace pickers, through the
 * real WASM path (gpxz reads the file and checks it names the open route).
 *
 * e2e/fixtures/grp-160-2026.plan.json is gpxz's plan for the fixture at
 * 7:30/km and a 30 min LifeBase stop:
 *   gpxz --plan --pace 450 --life-base-stop 1800 e2e/fixtures/grp-160-2026.gpx
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, heroDistanceKm, selectRunnerRole, test } from "./helpers.js";

const PLAN_FIXTURE = fileURLToPath(
  new URL("./fixtures/grp-160-2026.plan.json", import.meta.url),
);

const estTime = (page) =>
  page
    .locator(".stat-row .stat", { hasText: "est. time" })
    .locator(".stat-value");

test.describe("plan.json", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(heroDistanceKm(page)).not.toHaveText("0.0", {
      timeout: 30_000,
    });
  });

  test("its model replaces the pickers and the estimate", async ({ page }) => {
    const before = await estTime(page).textContent();
    await page.getByTestId("plan-input").setInputFiles(PLAN_FIXTURE);

    await expect(page.getByTestId("plan-model")).toHaveText(
      "7:30/km flat · fatigue 0.002 · 0h30 at each LifeBase",
    );
    await expect(
      page.getByRole("radiogroup", { name: "Runner profile" }),
    ).toHaveCount(0);
    // Faster than the 8:20/km default, with shorter stops: an earlier finish.
    await expect(estTime(page)).not.toHaveText(before);

    await page.getByRole("button", { name: "Use the pickers instead" }).click();
    await expect(
      page.getByRole("radiogroup", { name: "Runner profile" }),
    ).toBeVisible();
  });

  test("one made for another route is refused", async ({ page }) => {
    const plan = JSON.parse(readFileSync(PLAN_FIXTURE, "utf8"));
    plan.course.sha256 = "0".repeat(64);
    await page.getByTestId("plan-input").setInputFiles({
      name: "other.plan.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(plan)),
    });
    await expect(page.getByRole("alert")).toContainText("made for another GPX");
    await expect(
      page.getByRole("radiogroup", { name: "Runner profile" }),
    ).toBeVisible();
  });
});
