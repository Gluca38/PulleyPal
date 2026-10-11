import { expect, test } from "@playwright/test";

test("Startseite zeigt den App-Namen", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("PulleyPal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PulleyPal");
});
