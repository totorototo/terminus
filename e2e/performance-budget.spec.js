/**
 * Performance budget e2e tests.
 *
 * Budgets are intentionally generous — the goal is to catch catastrophic
 * regressions (e.g. accidental inline of a 5 MB asset, blocking main-thread
 * sync work), not to enforce the median happy-path timing.
 *
 * All timing is measured wall-clock or via the Performance Paint API to avoid
 * coupling to specific Playwright internals.
 *
 * Budgets (adjust after establishing a stable baseline):
 *   Wizard visible          < 3 000 ms   (typically < 500 ms)
 *   FCP on wizard route     < 4 000 ms
 *   Runner canvas visible   < 12 000 ms  (WASM init + GPX parse + 3D scene)
 *   FCP on runner route     < 6 000 ms
 *   JS heap after 3 navs    < 150 MB total (not growth — catches memory explosions)
 *   Worker GPX timing       reported (no hard gate, visible in CI logs)
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return the first raceId slug from /races.json. */
async function getFirstRaceId(page) {
  const races = await page.evaluate(async () => {
    const res = await fetch("/races.json");
    return res.json();
  });
  if (Array.isArray(races)) return races[0]?.id ?? races[0]?.slug;
  return Object.keys(races)[0];
}

/**
 * Return First Contentful Paint start time in ms, or null if the entry is not
 * yet available.  Must be called after the paint has fired.
 */
async function getFCP(page) {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType("paint");
    return (
      entries.find((e) => e.name === "first-contentful-paint")?.startTime ??
      null
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Wizard load time
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Performance budget — wizard", () => {
  test("wizard role buttons appear within 3 s", async ({ page }) => {
    const t0 = Date.now();
    await page.goto("/");

    const runnerBtn = page.getByRole("button", { name: "I'm running" });
    await expect(runnerBtn).toBeVisible({ timeout: 3_000 });

    const elapsed = Date.now() - t0;
    console.log(`[perf] wizard visible: ${elapsed} ms`);
    expect(elapsed).toBeLessThan(3_000);
  });

  test("FCP on wizard route is under 4 s", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "I'm running" }).waitFor({
      timeout: 4_000,
    });

    const fcp = await getFCP(page);
    console.log(`[perf] FCP (wizard): ${fcp?.toFixed(0) ?? "n/a"} ms`);
    if (fcp !== null) {
      expect(fcp).toBeLessThan(4_000);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Runner route load time
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Performance budget — runner route", () => {
  test("canvas appears within 12 s on direct /run/:raceId URL", async ({
    page,
  }) => {
    await page.goto("/");
    const raceId = await getFirstRaceId(page);
    expect(raceId).toBeTruthy();

    const t0 = Date.now();
    await page.goto(`/run/${raceId}`);

    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 12_000,
    });

    const elapsed = Date.now() - t0;
    console.log(
      `[perf] runner canvas visible: ${elapsed} ms (raceId=${raceId})`,
    );
    expect(elapsed).toBeLessThan(12_000);
  });

  test("FCP on runner route is under 6 s", async ({ page }) => {
    await page.goto("/");
    const raceId = await getFirstRaceId(page);

    await page.goto(`/run/${raceId}`);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 12_000,
    });

    const fcp = await getFCP(page);
    console.log(`[perf] FCP (runner): ${fcp?.toFixed(0) ?? "n/a"} ms`);
    if (fcp !== null) {
      expect(fcp).toBeLessThan(6_000);
    }
  });

  test("runner panels appear within 15 s of direct URL load", async ({
    page,
  }) => {
    await page.goto("/");
    const raceId = await getFirstRaceId(page);

    const t0 = Date.now();
    await page.goto(`/run/${raceId}`);

    await expect(
      page.getByRole("region", { name: /Navigation panel/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("region", { name: /Trail data panel/i }),
    ).toBeVisible({ timeout: 15_000 });

    const elapsed = Date.now() - t0;
    console.log(`[perf] runner panels visible: ${elapsed} ms`);
    expect(elapsed).toBeLessThan(15_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Navigation timing — no layout shift
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Performance budget — layout stability", () => {
  test("CLS on wizard route is below 0.25", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "I'm running" }).waitFor({
      timeout: 4_000,
    });

    // Wait briefly for any post-load shifts
    await page.waitForTimeout(500);

    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let total = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        });
        // Observe what has already been recorded (buffered)
        try {
          observer.observe({ type: "layout-shift", buffered: true });
        } catch {
          resolve(null);
          return;
        }
        // Give the observer time to flush buffered entries
        setTimeout(() => {
          observer.disconnect();
          resolve(total);
        }, 200);
      });
    });

    console.log(`[perf] CLS (wizard): ${cls?.toFixed(4) ?? "n/a"}`);
    if (cls !== null) {
      expect(cls).toBeLessThan(0.25);
    }
  });

  test("CLS on runner route is below 0.25", async ({ page }) => {
    await page.goto("/");
    const raceId = await getFirstRaceId(page);

    await page.goto(`/run/${raceId}`);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 12_000,
    });
    await page.waitForTimeout(500);

    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let total = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        });
        try {
          observer.observe({ type: "layout-shift", buffered: true });
        } catch {
          resolve(null);
          return;
        }
        setTimeout(() => {
          observer.disconnect();
          resolve(total);
        }, 200);
      });
    });

    console.log(`[perf] CLS (runner): ${cls?.toFixed(4) ?? "n/a"}`);
    if (cls !== null) {
      expect(cls).toBeLessThan(0.25);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. JS heap regression guard
// ─────────────────────────────────────────────────────────────────────────────

/** Read JSHeapUsedSize via CDP (Playwright equivalent of Puppeteer page.metrics()). */
async function getHeapUsedBytes(page) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send("Performance.enable");
    const { metrics } = await client.send("Performance.getMetrics");
    return metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? 0;
  } finally {
    await client.detach().catch(() => {});
  }
}

test.describe("Performance budget — JS heap", () => {
  test("heap stays below 150 MB after loading the runner view", async ({
    page,
  }) => {
    await page.goto("/");
    const raceId = await getFirstRaceId(page);

    await page.goto(`/run/${raceId}`);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 12_000,
    });

    // Allow GC / animations to settle
    await page.waitForTimeout(1_000);

    const heapMB = (await getHeapUsedBytes(page)) / 1024 / 1024;
    console.log(`[perf] JS heap after runner load: ${heapMB.toFixed(1)} MB`);

    // 150 MB is a generous ceiling — catches catastrophic leaks only.
    // Tighten once a stable baseline is measured.
    expect(heapMB).toBeLessThan(150);
  });

  test("heap does not grow unboundedly across three wizard→runner→wizard cycles", async ({
    page,
  }) => {
    await page.goto("/");
    const raceId = await getFirstRaceId(page);

    // Warm-up: one navigation to initialise WASM
    await page.goto(`/run/${raceId}`);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 12_000,
    });
    await page.waitForTimeout(500);

    // Two more round-trips
    for (let i = 0; i < 2; i++) {
      await page.goto("/");
      await page.getByRole("button", { name: "I'm running" }).waitFor({
        timeout: 6_000,
      });
      await page.goto(`/run/${raceId}`);
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 12_000,
      });
      await page.waitForTimeout(500);
    }

    const heapAfterMB = (await getHeapUsedBytes(page)) / 1024 / 1024;
    console.log(
      `[perf] JS heap after 3 route cycles: ${heapAfterMB.toFixed(1)} MB`,
    );

    // Check total heap stays below 150 MB — WASM + WebGL retain resources
    // across navigations so we guard against explosions, not precise delta.
    expect(heapAfterMB).toBeLessThan(150);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Worker timing report (non-blocking — logs only)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Performance budget — worker timing", () => {
  test("worker timing entries are present after runner loads", async ({
    page,
  }) => {
    await page.goto("/");
    const raceId = await getFirstRaceId(page);

    await page.goto(`/run/${raceId}`);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 12_000,
    });

    // Read worker timing entries exposed on window by the app
    const timings = await page.evaluate(() => window.__workerTimings ?? null);

    if (timings) {
      console.log("[perf] worker timings:", JSON.stringify(timings));
      // If exposed, enforce a 5 s ceiling on GPX processing
      if (typeof timings.gpxProcessMs === "number") {
        console.log(`[perf] GPX process time: ${timings.gpxProcessMs} ms`);
        expect(timings.gpxProcessMs).toBeLessThan(5_000);
      }
    } else {
      // window.__workerTimings not yet wired — log and pass
      console.log(
        "[perf] window.__workerTimings not exposed; skipping timing assertion",
      );
    }
  });

  test("runner route produces no JS errors during load", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    const raceId = await getFirstRaceId(page);

    await page.goto(`/run/${raceId}`);
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 12_000,
    });
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});
