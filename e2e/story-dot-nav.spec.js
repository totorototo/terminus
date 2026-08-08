/**
 * Story dot-nav e2e tests.
 *
 * StoryDotNav renders outside Story's scrolling container (see
 * storyNav.js's why-comment for why) but drives it via a registered scroll
 * handler, and tracks which section is current via an IntersectionObserver
 * scrollspy in Story.jsx. Both directions of that bridge are exercised here.
 */
import { expect, selectRunnerRole, test } from "./helpers.js";

const nav = (page) => page.locator('nav[aria-label="Story sections"]');
const dot = (page, label) =>
  nav(page).getByRole("button", { name: `Jump to ${label}` });

test.describe("Story dot nav", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectRunnerRole(page);
    await expect(page.locator("h1.name")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator(".stat-row .stat").first().locator(".stat-value"),
    ).not.toHaveText("0.0", { timeout: 30_000 });
  });

  test("renders one labeled dot per section, Overview active at the top", async ({
    page,
  }) => {
    await expect(nav(page).getByRole("button")).toHaveCount(9);
    await expect(dot(page, "Overview")).toHaveAttribute("aria-current", "true");
    await expect(dot(page, "End")).not.toHaveAttribute("aria-current");
  });

  test("clicking a dot jumps straight to that section", async ({ page }) => {
    const end = page.getByRole("heading", { name: "End of line" });
    await expect(end).not.toBeInViewport();

    await dot(page, "End").click();

    await expect(end).toBeInViewport();
  });

  test("scrolling the story updates which dot is marked current", async ({
    page,
  }) => {
    await expect(dot(page, "Overview")).toHaveAttribute("aria-current", "true");

    await dot(page, "Checkpoints").click();
    await expect(
      page.getByRole("heading", { name: "Checkpoints" }),
    ).toBeInViewport();

    await expect(dot(page, "Checkpoints")).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(dot(page, "Overview")).not.toHaveAttribute("aria-current");
  });

  test("dragging the strip reveals a label callout and jumps live as it crosses sections", async ({
    page,
  }) => {
    const callout = page.locator(".callout");
    await expect(callout).toHaveCount(0);

    await dot(page, "Overview").hover();
    await page.mouse.down();
    await expect(callout).toHaveText("Overview"); // labeled from the press itself, not just once dragged

    const climbsBox = await dot(page, "Climbs").boundingBox();
    await page.mouse.move(
      climbsBox.x + climbsBox.width / 2,
      climbsBox.y + climbsBox.height / 2,
      { steps: 5 },
    );
    await expect(callout).toHaveText("Climbs");
    await expect(
      page.getByRole("heading", { name: /^\d+ climbs$/ }),
    ).toBeInViewport();

    await page.mouse.up();
    await expect(callout).toHaveCount(0);
  });
});
