/**
 * Click "I'm running" on the wizard and wait for the app to load.
 * Call this after page.goto("/") in any test that needs the runner (trailer) UI.
 */
export async function selectRunnerRole(page) {
  await page
    .getByRole("button", { name: "I'm running" })
    .click({ timeout: 10000 });
}

/**
 * Go through the follower wizard steps: click "I'm following", enter the
 * provided room code, then click "Follow".
 * Call this after page.goto("/").
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} roomCode - 6-character uppercase room code
 */
export async function selectFollowerRole(page, roomCode) {
  await page
    .getByRole("button", { name: "I'm following" })
    .click({ timeout: 10000 });

  await page.locator("input.code-input").fill(roomCode);
  await page.getByRole("button", { name: "Follow" }).click();
}

/**
 * Install a clipboard mock on the page (before page.goto) that:
 *  - disables navigator.share so shareLocation falls back to the clipboard path
 *  - captures the text written to the clipboard in window.__capturedCode
 *
 * @param {import("@playwright/test").Page} page
 */
export async function mockClipboard(page) {
  await page.addInitScript(() => {
    window.__capturedCode = null;
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.__capturedCode = text;
        },
      },
      configurable: true,
    });
  });
}
