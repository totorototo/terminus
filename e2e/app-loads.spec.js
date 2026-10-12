/**
 * Smoke tests — verify the app boots correctly and key UI is present.
 *
 * The runner UI is a single scroll-driven story with no separate
 * mobile/desktop layout components — both viewport sizes render the same
 * sections, only CSS changes. These tests confirm the story mounts and the
 * key sections are reachable, at both a mobile and a desktop viewport.
 */

import { expect, GPX_FIXTURE, selectRunnerRole, test } from "./helpers.js";

test.describe("Smoke", () => {
  test("wizard loads without JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Terminus" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Open the GPX of the race you're running today."),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("mobile: runner flow loads the story", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await selectRunnerRole(page); // forces 390×844

    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Where you are" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /switch to (light|dark) mode/i }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("desktop: runner flow loads the story", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await page.getByTestId("gpx-input").setInputFiles(GPX_FIXTURE);

    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Where you are" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
});
