import { expect, test, type Page } from "@playwright/test";
import { login } from "./login-helpers";

// Feste Zeitzone, damit „heute“ im Test und im Browser dasselbe Datum ist
const TIME_ZONE = "Europe/Berlin";
test.use({ timezoneId: TIME_ZONE });

// Datum „heute minus N Tage“ im Format des Datumsfelds (JJJJ-MM-TT)
function daysAgo(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function recordGradeTwo(page: Page, startDate: string, duration?: string) {
  await page.getByRole("radio", { name: /Grad II\b/ }).check();
  await page.getByLabel("Tag der Verletzung").fill(startDate);
  if (duration) {
    await page.getByLabel(/Verordnete Dauer/).selectOption({ label: duration });
  }
  await page.getByLabel(/keine ärztliche Behandlung ersetzt/).check();
  await page.getByRole("button", { name: "Behandlungsplan erstellen" }).click();
  await expect(page).toHaveURL("/");
}

test("Neue Person erfasst Grad II und sieht die Heute-Karte", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Verletzung erfassen");
  await expect(page.getByText(/PulleyPal stellt keine Diagnose/)).toBeVisible();
  // Nur Grad II ist schon auswählbar
  await expect(page.getByRole("radio", { name: /Grad I\b/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /Grad III/ })).toBeDisabled();
  await expect(page.getByText("folgt bald")).toHaveCount(4);

  // Verletzung vor 20 Tagen = Tag 21 = Woche 3
  await recordGradeTwo(page, daysAgo(20));

  await expect(page).toHaveTitle("PulleyPal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PulleyPal");
  await expect(page.getByText(/^Woche 3 von 1[34]$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Woche 3–4 mit Ringbandschutzring" })).toBeVisible();
  await expect(page.getByText("Kein Klettern mit dem Ringbandschutzring")).toBeVisible();
  await expect(page.getByText(/Leichte sportartspezifische Aktivität/)).toBeVisible();
  await expect(page.getByText(/noch 22 Tage/)).toBeVisible();

  // Die Verletzung ist erfasst, das Formular wird nicht mehr gebraucht
  await page.goto("/verletzung");
  await expect(page).toHaveURL("/");
});

test("Nachträglich erfasst mit 8 Wochen: direkt in der Schutzphase", async ({ page }) => {
  await login(page);

  // Vor 60 Tagen verletzt, volle Aktivität nach 8 Wochen (Tag 57) = Woche 9
  await recordGradeTwo(page, daysAgo(60), "8 Wochen");

  await expect(page.getByText(/^Woche 9 von 1[34]$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Schutzphase mit H-Tape" })).toBeVisible();
  await expect(page.getByText(/Ende des H-Tape-Schutzes/)).toBeVisible();
});

test("Eingabeprüfung beim Erfassen", async ({ page }) => {
  await login(page);
  const submit = page.getByRole("button", { name: "Behandlungsplan erstellen" });

  await submit.click();
  // Next.js hat selbst ein unsichtbares Element mit dieser Rolle, daher nach Text filtern
  const alerts = page.getByRole("alert");
  await expect(alerts.filter({ hasText: "Bitte wähle den Grad" })).toBeVisible();
  await expect(alerts.filter({ hasText: "Bitte gib den Tag der Verletzung ein" })).toBeVisible();
  await expect(alerts.filter({ hasText: "Bitte bestätige" })).toBeVisible();

  await page.getByRole("radio", { name: /Grad II\b/ }).check();
  await page.getByLabel("Tag der Verletzung").fill(daysAgo(-1));
  await page.getByLabel(/keine ärztliche Behandlung ersetzt/).check();
  await submit.click();

  await expect(alerts.filter({ hasText: "darf nicht in der Zukunft liegen" })).toBeVisible();
  await expect(page).toHaveURL("/verletzung");
});
