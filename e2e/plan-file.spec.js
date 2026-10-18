/**
 * The race's plan.json from Regimen: its model is the pace, with no pickers,
 * through the real WASM path (gpxz reads the file and checks it names the
 * route). Opening it with the GPX is covered in wizard.spec.js.
 */

import { readFileSync } from "node:fs";

import {
  expect,
  FAST_PLAN_FIXTURE,
  heroDistanceKm,
  PLAN_FIXTURE,
  replacePlan,
  selectRunnerRole,
  test,
} from "./helpers.js";

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

  test("its model is the pace, and a faster one moves the estimate", async ({
    page,
  }) => {
    await expect(page.getByRole("radiogroup")).toHaveCount(0);
    await expect(page.getByTestId("plan-model")).toHaveText(
      "7:30/km flat · fatigue 0.002 · 0h30 at each LifeBase",
    );
    const before = await estTime(page).textContent();

    await replacePlan(page, FAST_PLAN_FIXTURE);
    await expect(page.getByTestId("plan-model")).toHaveText(
      "5:00/km flat · fatigue 0.001 · 0h30 at each LifeBase",
    );
    await expect(estTime(page)).not.toHaveText(before);
  });

  test("a replacement made for another route is refused", async ({ page }) => {
    const plan = JSON.parse(readFileSync(PLAN_FIXTURE, "utf8"));
    plan.course.sha256 = "0".repeat(64);
    await replacePlan(page, {
      name: "other.plan.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(plan)),
    });
    await expect(page.getByRole("alert")).toContainText("made for another GPX");
    await expect(page.getByTestId("plan-model")).toContainText("7:30/km flat");
  });
});
