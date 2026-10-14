import { expect, test } from "@playwright/test";
import { login } from "./login-helpers";

test("Startseite zeigt den App-Namen", async ({ page }) => {
  // Die Startseite ist seit dem Login (#8) nur für eingeloggte Personen
  await login(page);

  await expect(page).toHaveTitle("PulleyPal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PulleyPal");
});
