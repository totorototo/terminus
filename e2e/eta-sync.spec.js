/**
 * End-to-end regression test for finish-ETA consistency across Hero,
 * Milestones, and Checkpoints.
 *
 * These three sections independently render the same "finish" estimate:
 *   - StoryHero's "est. time" stat (a duration, e.g. "0h 25m")
 *   - StoryStages' ("Milestones") last row (a clock time, e.g. "Sat 03:46")
 *   - StoryCheckpoints' last row (the same clock time)
 *
 * Milestones' and Checkpoints' finish rows must render an identical string —
 * both are sourced from the same checkpointETAs[last] entry. Hero renders a
 * duration instead of a clock time, so it can't be string-compared directly,
 * but it must still move whenever the other two do — this pins down the bug
 * where Hero silently kept its old estimate after a GPS fix or a pace change.
 *
 * Covers, for a single runner:
 *   1. Baseline (a-priori) agreement before any GPS fix.
 *   2. A location update (Spot me) recalibrates all three together.
 *   3. A pace-settings change (runner profile, Casual → Elite) recalibrates
 *      all three together.
 *   4. A pace-settings change in the other direction (Elite → Casual) does
 *      the same — pace changes aren't only tested one way.
 *
 * ...and, with a real PartyKit relay (no WebSocket mocking, same as
 * location-sharing.spec.js), that a follower's three sections track a
 * runner's after all three kinds of updates.
 */

import { expect, test } from "@playwright/test";

import {
  autoShareBtn,
  heroDistanceKm,
  MID_TRAIL,
  mockClipboard,
  selectFollowerRole,
  selectRunnerRole,
} from "./helpers.js";

// grp-160-2026.gpx's race Start waypoint, pinned 2h past it (same fixture as
// live-recalibration.spec.js) — a mid-trail fix needs to postdate race start
// on both the mount-time `Date.now()` in useCheckpointETAs (raceNotStarted
// gating) and the fix's own timestamp, or recalibration is skipped entirely.
const RACE_STARTED_AT = new Date("2026-08-21T07:00:00Z");

// Milestones and Checkpoints both collapse to a short preview past a row
// threshold (see useCollapsibleList), and that collapsed state is local to
// the component — a reprocess (pace change, recalibration) can transiently
// empty checkpointETAs, unmounting and remounting StoryCheckpoints/StoryStages
// and resetting it back to collapsed. So re-expand right before every read,
// not just once, or `.last()` can silently land on the last *visible* row
// instead of the true finish.
async function expandIfCollapsed(page, listSelector) {
  const toggle = page.locator(`${listSelector} ~ button`);
  if (await toggle.count()) {
    await toggle.click();
  }
}

async function readMilestoneFinish(page) {
  await expandIfCollapsed(page, ".stage-list");
  return milestoneFinishEta(page).textContent();
}

async function readCheckpointFinish(page) {
  await expandIfCollapsed(page, ".checkpoint-list");
  return checkpointFinishEta(page).textContent();
}

async function injectGeolocationFix(page, pos) {
  await page.addInitScript((p) => {
    navigator.geolocation.getCurrentPosition = (success) =>
      success({
        coords: {
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
  }, pos);
}

const heroEstTime = (page) =>
  page
    .locator(".stat-row .stat", { has: page.getByText("est. time") })
    .locator(".stat-value");

// Milestones' last row is the finish (Arrival) — same locator used by
// live-recalibration.spec.js.
const milestoneFinishEta = (page) =>
  page.locator(".stage-row").last().locator(".stage-eta > span").first();

const checkpointFinishEta = (page) =>
  page
    .locator(".checkpoint-row")
    .last()
    .locator(".checkpoint-eta > span")
    .first();

// Recalibration touches Milestones' and Checkpoints' finish rows via two
// independent useCheckpointETAs() calls (in StoryStages and StoryCheckpoints)
// that re-render on their own schedule — reading them back-to-back right
// after the first observed change can catch one mid-update. Poll until both
// land on the same, new value before treating it as settled.
//
// A pace change also isn't a single atomic update — reprocessing and the
// best-effort recalibration land as separate re-renders, so the finish time
// visibly passes through several transient values (observed: 3-4, within
// roughly a second) before its true final one. Polling at Playwright's
// default backoff (starting at 100ms) can catch one of those transients
// sitting still for a single tick and mistake it for settled, so poll at a
// fixed, wider spacing — comfortably past the observed thrash window — and
// still require two consecutive matches at that spacing.
const SETTLE_POLL_INTERVALS = [750];

async function waitForAgreement(page, previousValue) {
  let settled;
  let lastCandidate = null;
  await expect
    .poll(
      async () => {
        const milestone = await readMilestoneFinish(page);
        const checkpoint = await readCheckpointFinish(page);
        if (milestone === checkpoint && milestone !== previousValue) {
          if (lastCandidate === milestone) {
            settled = milestone;
            return true;
          }
          lastCandidate = milestone;
        } else {
          lastCandidate = null;
        }
        return false;
      },
      { timeout: 20_000, intervals: SETTLE_POLL_INTERVALS },
    )
    .toBe(true);
  return settled;
}

// Hero's "est. time" stat is driven by its own independent useCheckpointETAs()
// call too, so it's just as prone to being read mid-transient as the
// milestone/checkpoint rows above — poll until the same text shows up twice
// in a row, at the same wide spacing, before trusting it.
async function waitForStableText(locator, timeout = 20_000) {
  let lastValue = null;
  let text;
  await expect
    .poll(
      async () => {
        text = await locator.textContent();
        if (text === lastValue) return true;
        lastValue = text;
        return false;
      },
      { timeout, intervals: SETTLE_POLL_INTERVALS },
    )
    .toBe(true);
  return text;
}

test.describe("ETA sync across Hero, Milestones, and Checkpoints", () => {
  test("runner: all three stay in lockstep after a location update and a pace change", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.clock.setFixedTime(RACE_STARTED_AT);
    await injectGeolocationFix(page, MID_TRAIL);
    await mockClipboard(page);

    await page.goto("/");
    await selectRunnerRole(page);

    await expect(heroDistanceKm(page)).not.toHaveText("0.0", {
      timeout: 30_000,
    });
    await expect(milestoneFinishEta(page)).toBeAttached({ timeout: 10_000 });

    // Baseline (a-priori, no GPS fix yet): Milestones and Checkpoints must
    // already agree.
    const hero0 = await waitForStableText(heroEstTime(page));
    const milestone0 = await readMilestoneFinish(page);
    const checkpoint0 = await readCheckpointFinish(page);
    expect(milestone0).toBe(checkpoint0);

    // ── 1. Location update ────────────────────────────────────────────────
    await autoShareBtn(page).click();

    const milestone1 = await waitForAgreement(page, milestone0);
    const hero1 = await waitForStableText(heroEstTime(page));
    expect(hero1).not.toBe(hero0);

    // ── 2. Pace-settings change (Casual → Elite) ──────────────────────────
    await page.getByRole("radio", { name: "Elite" }).click();

    const milestone2 = await waitForAgreement(page, milestone1);
    const hero2 = await waitForStableText(heroEstTime(page));
    expect(hero2).not.toBe(hero1);

    // ── 3. Pace-settings change back (Elite → Casual) ─────────────────────
    await page.getByRole("radio", { name: "Casual" }).click();

    await waitForAgreement(page, milestone2);
    const hero3 = await waitForStableText(heroEstTime(page));
    expect(hero3).not.toBe(hero2);
  });

  test(
    "follower: tracks the runner's finish ETA after a location update and pace changes in both directions",
    { timeout: 150_000 },
    async ({ browser }) => {
      const runnerCtx = await browser.newContext();
      const followerCtx = await browser.newContext();

      try {
        // ── Runner joins ─────────────────────────────────────────────────
        const runnerPage = await runnerCtx.newPage();
        await runnerPage.clock.setFixedTime(RACE_STARTED_AT);
        await injectGeolocationFix(runnerPage, MID_TRAIL);
        await mockClipboard(runnerPage);

        await runnerPage.goto("/");
        await selectRunnerRole(runnerPage);
        await expect(runnerPage.locator("h1.name")).toBeVisible({
          timeout: 15_000,
        });
        await expect(heroDistanceKm(runnerPage)).not.toHaveText("0.0", {
          timeout: 30_000,
        });

        await runnerPage
          .getByRole("button", { name: "Invite someone to follow" })
          .click();
        const capturedUrl = await runnerPage.evaluate(
          () => window.__capturedCode,
        );
        expect(capturedUrl).toMatch(/\/follow\/[^/]+\/[a-f0-9]{16}$/);
        const roomCode = capturedUrl.split("/").pop();

        // ── Follower joins that room ────────────────────────────────────
        const followerPage = await followerCtx.newPage();
        await followerPage.clock.setFixedTime(RACE_STARTED_AT);

        await followerPage.goto("/");
        await selectFollowerRole(followerPage, roomCode);
        await expect(followerPage.locator("h1.name")).toBeVisible({
          timeout: 15_000,
        });
        await expect(heroDistanceKm(followerPage)).not.toHaveText("0.0", {
          timeout: 30_000,
        });

        // ── 1. Runner broadcasts a location fix ──────────────────────────
        const milestoneRunner0 = await readMilestoneFinish(runnerPage);

        await autoShareBtn(runnerPage).click();

        const milestoneRunner1 = await waitForAgreement(
          runnerPage,
          milestoneRunner0,
        );
        const heroRunner1 = await waitForStableText(heroEstTime(runnerPage));

        await expect
          .poll(() => readMilestoneFinish(followerPage), { timeout: 15_000 })
          .toBe(milestoneRunner1);
        await expect
          .poll(() => readCheckpointFinish(followerPage))
          .toBe(milestoneRunner1);
        await expect
          .poll(async () => heroEstTime(followerPage).textContent())
          .toBe(heroRunner1);

        // ── 2. Runner changes pace settings (Casual → Elite) ─────────────
        await runnerPage.getByRole("radio", { name: "Elite" }).click();

        const milestoneRunner2 = await waitForAgreement(
          runnerPage,
          milestoneRunner1,
        );
        const heroRunner2 = await waitForStableText(heroEstTime(runnerPage));

        await expect
          .poll(() => readMilestoneFinish(followerPage), { timeout: 30_000 })
          .toBe(milestoneRunner2);
        await expect
          .poll(() => readCheckpointFinish(followerPage))
          .toBe(milestoneRunner2);
        await expect
          .poll(async () => heroEstTime(followerPage).textContent())
          .toBe(heroRunner2);

        // ── 3. Runner changes pace settings back (Elite → Casual) ────────
        await runnerPage.getByRole("radio", { name: "Casual" }).click();

        const milestoneRunner3 = await waitForAgreement(
          runnerPage,
          milestoneRunner2,
        );
        const heroRunner3 = await waitForStableText(heroEstTime(runnerPage));

        await expect
          .poll(() => readMilestoneFinish(followerPage), { timeout: 30_000 })
          .toBe(milestoneRunner3);
        await expect
          .poll(() => readCheckpointFinish(followerPage))
          .toBe(milestoneRunner3);
        await expect
          .poll(async () => heroEstTime(followerPage).textContent())
          .toBe(heroRunner3);
      } finally {
        await runnerCtx.close();
        await followerCtx.close();
      }
    },
  );
});
