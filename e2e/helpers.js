/**
 * Click "I'm running" on the wizard and wait for the app to load.
 * Call this after page.goto("/") in any test that needs the runner (trailer) UI.
 */
export async function selectRunnerRole(page) {
  await page
    .getByRole("button", { name: "I'm running" })
    .click({ timeout: 10000 });
}
