/**
 * The race's plan.json from Regimen: its model is the pace, with no pickers,
 * through the real WASM path (gpxz reads the file and checks it names the
 * route). Opening it with the GPX is covered in wizard.spec.js.
 */

import { readFileSync } from "node:fs";

import {
  expect,
  FAST_PLAN_FIXTURE,
  FUELED_PLAN_FIXTURE,
  heroDistanceKm,
  PLAN_FIXTURE,
  replacePlan,
  selectRunnerRole,
  SLOW_PLAN_FIXTURE,
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

  // Regression test: Terminus used to pin an ETA past a missed cutoff to the
  // cutoff, so its finish read 43h 44m against Regimen's 44h 21m.
  test("the finish is the plan's, even past a missed cutoff", async ({
    page,
  }) => {
    const plan = JSON.parse(readFileSync(SLOW_PLAN_FIXTURE, "utf8"));
    const finishS = plan.entries.at(-1).duration_s_arrival;
    const finish = `${Math.floor(finishS / 3600)}h ${Math.floor((finishS % 3600) / 60)}m`;

    await replacePlan(page, SLOW_PLAN_FIXTURE);
    await expect(page.getByTestId("plan-model")).toContainText("8:50/km flat");
    await expect(estTime(page)).toHaveText(finish);
  });

  // The v1 fixtures above still read; a v2 plan brings Regimen's fueling,
  // shown as the plan has it.
  test("a plan with fueling shows its targets and what to carry", async ({
    page,
  }) => {
    await expect(page.getByTestId("plan-fueling")).toHaveCount(0);
    await replacePlan(page, FUELED_PLAN_FIXTURE);
    await expect(page.getByTestId("plan-fueling")).toHaveText(
      "70 g carbs · 500 ml fluid · 400 mg sodium per hour · 30 min reserve",
    );
    const plan = JSON.parse(readFileSync(FUELED_PLAN_FIXTURE, "utf8"));
    const start = plan.carry[0];
    await expect(page.getByTestId("now-fuel")).toContainText(
      `Leave the start with ${start.carbs_g} g carbs`,
    );
    // One refill line per checkpoint the plan refills at, the finish aside.
    const refills = plan.model.fueling.supplies
      .slice(1)
      .filter((supply, i) => supply !== "none" && plan.carry[i + 1] != null);
    const rows = page.getByTestId("checkpoint-refill");
    await expect(rows.first()).toBeAttached();
    expect(await rows.count()).toBeLessThanOrEqual(refills.length);
    await expect(rows.first()).toContainText("Leave with");
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
