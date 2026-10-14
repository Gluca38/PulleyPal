import { expect, test } from "@playwright/test";
import { fetchLoginLink, login, requestLoginLink, uniqueEmail } from "./login-helpers";

test("Gäste werden von der Startseite zum Login umgeleitet", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Anmelden");
});

test("Login per Link und Logout", async ({ page }) => {
  const email = await login(page);

  await expect(page.getByText(`Angemeldet als ${email}`)).toBeVisible();

  // Eingeloggte Personen brauchen die Login-Seite nicht
  await page.goto("/login");
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("Schon benutzter Link zeigt Hinweis und erlaubt neuen Link", async ({ page, browser }) => {
  const email = uniqueEmail();
  await requestLoginLink(page, email);
  const link = await fetchLoginLink(email);

  // Erster Klick meldet an, damit ist der Link verbraucht
  await page.goto(link);
  await expect(page).toHaveURL("/");

  // Zweiter Klick in einem frischen Browser (nicht eingeloggt)
  const guest = await browser.newPage();
  await guest.goto(link);

  await expect(guest).toHaveURL("/login?fehler=link-ungueltig");
  // Next.js hat selbst ein unsichtbares Element mit dieser Rolle, daher nach Text filtern
  await expect(
    guest.getByRole("alert").filter({ hasText: "abgelaufen oder wurde schon benutzt" }),
  ).toBeVisible();
  await expect(guest.getByRole("button", { name: "Login-Link senden" })).toBeVisible();
  await guest.close();
});
