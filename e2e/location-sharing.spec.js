/**
 * Real end-to-end integration test for location sharing.
 *
 * No WebSocket or fetch mocking — the route and positions flow through a
 * real relay:
 *   - by default (locally and in CI): `wrangler dev` on port 1999, started by
 *     playwright.config.js from this checkout
 *   - with E2E_BASE_URL (CI's post-deploy smoke test): the deployed site and
 *     its relay
 *
 * Flow:
 *   1. Runner opens a GPX from the wizard.
 *   2. Runner clicks "Invite someone to follow": the GPX is uploaded to the
 *      room and a follow URL lands in the clipboard.
 *   3. Follower opens that URL directly, same as clicking a shared link, and
 *      reads the same race — downloaded from the room, not from the site.
 *   4. Runner clicks "Spot me" — fake GPS at the trail midpoint triggers
 *      spotMe → Zig projection → relay broadcast.
 *   5. The follower's "Right now" km-left moves off its pre-fix baseline.
 */

import {
  autoShareBtn,
  expect,
  FUELED_PLAN_FIXTURE,
  heroDistanceKm,
  inviteFollower,
  kmLeft,
  MID_TRAIL,
  mockClipboard,
  nowStat,
  replacePlan,
  selectRunnerRole,
  test,
} from "./helpers.js";

async function openRunner(browser) {
  const runnerCtx = await browser.newContext({
    geolocation: MID_TRAIL,
    permissions: ["geolocation"],
  });
  const runnerPage = await runnerCtx.newPage();
  await mockClipboard(runnerPage);
  await runnerPage.goto("/");
  await selectRunnerRole(runnerPage);
  // GPX pipeline gate — sections/cumulativeDistances (which spotMe's
  // findClosestLocation needs) finish after the hero's distance stat
  // populates, not merely after the trail name renders.
  await expect(heroDistanceKm(runnerPage)).not.toHaveText("0.0", {
    timeout: 30_000,
  });
  return { runnerCtx, runnerPage };
}

// The follower shows the runner's own fix and projection: the same km left
// and the same ETA, both live. km left counts up with an animation, so a
// single read can catch a frame mid-way; poll until both sides settle on the
// same figures. Before a fix both show the whole route, so the live badge,
// not the figure, says a fix arrived.
const nowFigures = async (page) => ({
  live: await page.getByTestId("live-badge").isVisible(),
  kmLeft: await kmLeft(page).textContent(),
  eta: await nowStat(page, "eta").textContent(),
});

async function expectSamePosition(runnerPage, followerPage) {
  await expect
    .poll(
      async () => {
        const [runner, follower] = await Promise.all([
          nowFigures(runnerPage),
          nowFigures(followerPage),
        ]);
        const fixed = runner.live && /^\d+\.\d$/.test(runner.kmLeft);
        return fixed && JSON.stringify(runner) === JSON.stringify(follower)
          ? "same"
          : `runner ${JSON.stringify(runner)}, follower ${JSON.stringify(follower)}`;
      },
      { timeout: 20_000 },
    )
    .toBe("same");
}

test.describe("Location Sharing", () => {
  test(
    "runner shares the race and their location → follower receives both",
    { timeout: 90_000 },
    async ({ browser }) => {
      const { runnerCtx, runnerPage } = await openRunner(browser);
      const followerCtx = await browser.newContext();

      try {
        const followUrl = await inviteFollower(runnerPage);

        const followerPage = await followerCtx.newPage();
        await followerPage.goto(followUrl);

        // Same race as the runner's: name and distance come from the
        // runner's own file, carried by the relay.
        await expect(followerPage.locator("h1.name")).toHaveText(
          await runnerPage.locator("h1.name").textContent(),
          { timeout: 30_000 },
        );
        await expect(heroDistanceKm(followerPage)).toHaveText(
          await heroDistanceKm(runnerPage).textContent(),
          { timeout: 30_000 },
        );

        // Baseline: before any location update, the whole route is left and
        // nothing is live.
        await expect(kmLeft(followerPage)).toHaveText(
          await heroDistanceKm(followerPage).textContent(),
        );
        await expect(followerPage.getByTestId("live-badge")).toBeHidden();

        await autoShareBtn(runnerPage).click();
        await expectSamePosition(runnerPage, followerPage);
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );

  // A plan with fueling made the location message outgrow the relay's 1 KiB
  // limit, and the relay dropped every position (fixed in 2138046). The
  // fueling stays on the runner's device; the position must still arrive.
  test(
    "with a fueling plan, the follower still receives the position",
    { timeout: 90_000 },
    async ({ browser }) => {
      const { runnerCtx, runnerPage } = await openRunner(browser);
      const followerCtx = await browser.newContext();

      try {
        await replacePlan(runnerPage, FUELED_PLAN_FIXTURE);
        await expect(runnerPage.getByTestId("plan-fueling")).toBeVisible({
          timeout: 30_000,
        });
        const followUrl = await inviteFollower(runnerPage);

        const followerPage = await followerCtx.newPage();
        await followerPage.goto(followUrl);
        await expect(heroDistanceKm(followerPage)).toHaveText(
          await heroDistanceKm(runnerPage).textContent(),
          { timeout: 30_000 },
        );
        await expect(kmLeft(followerPage)).toHaveText(
          await heroDistanceKm(followerPage).textContent(),
        );

        await autoShareBtn(runnerPage).click();
        await expectSamePosition(runnerPage, followerPage);
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );

  test(
    "after the runner stops sharing, a new follower is sent to the wizard",
    { timeout: 90_000 },
    async ({ browser }) => {
      const { runnerCtx, runnerPage } = await openRunner(browser);
      const followerCtx = await browser.newContext();

      try {
        const followUrl = await inviteFollower(runnerPage);
        await runnerPage.getByRole("button", { name: "Stop sharing" }).click();
        await expect(
          runnerPage.getByRole("button", { name: "Stop sharing" }),
        ).toBeHidden();

        const followerPage = await followerCtx.newPage();
        await followerPage.goto(followUrl);

        // downloadRoute retries a missing route for ~9 s before giving up.
        await expect(followerPage).toHaveURL(/\/$/, { timeout: 30_000 });
        await expect(
          followerPage.getByText("This race is no longer shared."),
        ).toBeVisible();
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );
});
