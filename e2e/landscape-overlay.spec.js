/**
 * LandscapeOverlay e2e tests.
 *
 * The overlay is pure CSS, activated only by:
 *   @media (orientation: landscape) and (hover: none) and (pointer: coarse)
 *
 * That means it only fires on touch devices (pointer: coarse + hover: none)
 * held in landscape orientation. Desktop browsers (pointer: fine + hover: hover)
 * are never affected.
 *
 * Playwright sets the correct pointer/hover media features when both
 * hasTouch: true and isMobile: true are set on the browser context.
 * Each test first verifies that the media query actually matches in the
 * emulated environment before asserting overlay visibility, so a failure
 * in Playwright's CSS media emulation surfaces as a clear skip rather
 * than a silent false positive/negative.
 */

import { expect, test } from "@playwright/test";

const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };

const MEDIA_QUERY =
  "(orientation: landscape) and (hover: none) and (pointer: coarse)";

/** Returns true if the landscape+touch media query matches in this page context. */
const mediaMatches = (page) =>
  page.evaluate((mq) => matchMedia(mq).matches, MEDIA_QUERY);

const overlay = (page) => page.getByText("Please rotate your device");

test.describe("Landscape Overlay", () => {
  test("hidden in portrait on a touch device", async ({ browser }) => {
    const ctx = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: PORTRAIT,
    });
    try {
      const page = await ctx.newPage();
      await page.goto("/");

      // Portrait → media query must not match
      expect(await mediaMatches(page)).toBe(false);
      await expect(overlay(page)).not.toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("visible in landscape on a touch device", async ({ browser }) => {
    const ctx = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: LANDSCAPE,
    });
    try {
      const page = await ctx.newPage();
      await page.goto("/");

      // Confirm the media query actually matches in this emulated context —
      // if Playwright doesn't set pointer: coarse correctly, this will fail
      // with a clear message rather than a silent wrong overlay assertion.
      expect(await mediaMatches(page)).toBe(true);
      await expect(overlay(page)).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("never shown on desktop even in landscape viewport", async ({
    browser,
  }) => {
    // Desktop context: hover: hover + pointer: fine → media query never matches
    const ctx = await browser.newContext({
      viewport: LANDSCAPE,
    });
    try {
      const page = await ctx.newPage();
      await page.goto("/");

      expect(await mediaMatches(page)).toBe(false);
      await expect(overlay(page)).not.toBeVisible();
    } finally {
      await ctx.close();
    }
  });
});
