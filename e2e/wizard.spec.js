/**
 * Wizard e2e tests — covers opening a race (its GPX, then its plan.json) from
 * the first screen.
 */

import { readFileSync } from "node:fs";

import {
  expect,
  GPX_FIXTURE,
  openRace,
  PLAN_FIXTURE,
  test,
} from "./helpers.js";

test.describe("Wizard", () => {
  test("offers to open a GPX on first load", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /open gpx/i })).toBeVisible();
  });

  test("opens a picked GPX and its plan.json, and launches the app", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /open plan\.json/i }),
    ).toBeDisabled();

    await openRace(page);

    await expect(page).toHaveURL(/\/run$/);
    await expect(page.getByTestId("plan-model")).toHaveText(
      "7:30/km flat · fatigue 0.002 · 0h30 at each LifeBase",
    );
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
  });

  test("reopens the same race after a reload", async ({ page }) => {
    await page.goto("/");
    await openRace(page);
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
    const name = await page.locator("h1.name").textContent();

    await page.reload();

    await expect(page.locator("h1.name")).toHaveText(name, {
      timeout: 15_000,
    });
  });

  test("refuses a file that is not a GPX", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("gpx-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a route"),
    });

    await expect(page.getByRole("alert")).toHaveText("Choose a .gpx file.");
    await expect(page).toHaveURL(/\/$/);
  });

  test("refuses a plan.json made for another GPX, and stays", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("gpx-input").setInputFiles(GPX_FIXTURE);
    await expect(
      page.getByRole("button", { name: /open plan\.json/i }),
    ).toBeEnabled();
    const plan = JSON.parse(readFileSync(PLAN_FIXTURE, "utf8"));
    plan.course.sha256 = "0".repeat(64);
    await page.getByTestId("plan-input").setInputFiles({
      name: "other.plan.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(plan)),
    });

    await expect(page.getByRole("alert")).toContainText("made for another GPX");
    await expect(page).toHaveURL(/\/$/);
  });

  test("sends /run back to the wizard when no GPX was opened", async ({
    page,
  }) => {
    await page.goto("/run");

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /open gpx/i })).toBeVisible();
  });
});
