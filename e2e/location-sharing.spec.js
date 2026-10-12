/**
 * Real end-to-end integration test for location sharing.
 *
 * No WebSocket or fetch mocking — the route and positions flow through a
 * real PartyKit relay:
 *   - locally: `partykit dev --port 1999` (started by playwright.config.js)
 *   - in CI:   the cloud relay deployed at VITE_PARTYKIT_HOST
 *
 * Flow:
 *   1. Runner opens a GPX from the wizard.
 *   2. Runner clicks "Invite someone to follow": the GPX is uploaded to the
 *      room and a follow URL lands in the clipboard.
 *   3. Follower opens that URL directly, same as clicking a shared link, and
 *      reads the same race — downloaded from the room, not from the site.
 *   4. Runner clicks "Spot me" — fake GPS at the trail midpoint triggers
 *      spotMe → Zig projection → PartyKit broadcast.
 *   5. The follower's "Right now" km-left moves off its pre-fix baseline.
 */

import { readFileSync } from "node:fs";

import {
  autoShareBtn,
  expect,
  GPX_FIXTURE,
  heroDistanceKm,
  inviteFollower,
  kmLeft,
  MID_TRAIL,
  mockClipboard,
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

        // Baseline: before any location update, km-left has no live fix yet.
        await expect(kmLeft(followerPage)).toHaveText("0");

        await autoShareBtn(runnerPage).click();

        await expect(kmLeft(followerPage)).not.toHaveText("0", {
          timeout: 15_000,
        });
        await expect(kmLeft(followerPage)).toHaveText(/^\d+\.\d$/);
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

  test(
    "a follower of a waypoint-less race sees it named after the file",
    { timeout: 90_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext();
      const followerCtx = await browser.newContext();

      try {
        const runnerPage = await runnerCtx.newPage();
        await mockClipboard(runnerPage);
        await runnerPage.goto("/");
        // The GRP route, as a race director might publish it: no waypoints
        // and no <name>, so the trail is named after the file.
        const bare = readFileSync(GPX_FIXTURE, "utf8")
          .replace(/<wpt[\s\S]*?<\/wpt>/g, "")
          .replace(/<name>[\s\S]*?<\/name>/g, "");
        await runnerPage.getByTestId("gpx-input").setInputFiles({
          name: "Tour du Lac.gpx",
          mimeType: "application/gpx+xml",
          buffer: Buffer.from(bare),
        });
        await expect(runnerPage.locator("h1.name")).toHaveText("Tour du Lac", {
          timeout: 15_000,
        });

        const followUrl = await inviteFollower(runnerPage);
        const followerPage = await followerCtx.newPage();
        await followerPage.goto(followUrl);

        await expect(followerPage.locator("h1.name")).toHaveText(
          "Tour du Lac",
          { timeout: 30_000 },
        );
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );
});
