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

// Datum so, wie die App es auf Deutsch anzeigt, z. B. „12. Februar 2026“
function formatted(isoDate: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

test("Zeitleiste zeigt alle Phasen und Meilensteine, die aktuelle hervorgehoben", async ({ page }) => {
  await login(page);
  // Verletzung vor 20 Tagen: aktuell Woche 3–4
  await recordGradeTwo(page, daysAgo(20));

  const timeline = page.getByRole("region", { name: "Zeitleiste" });
  await expect(timeline.locator("summary")).toHaveText([
    /Woche 1–2/,
    /Woche 3–4/,
    /Woche 5–6/,
    /Aufbautraining/,
    /Schutzphase mit H-Tape/,
  ]);

  // Aktuelle Phase: hervorgehoben und aufgeklappt
  const current = timeline.locator('[aria-current="step"]');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText("Woche 3–4");
  await expect(current.getByText(/Isometrie, Krankengymnastik/)).toBeVisible();

  // Andere Phasen sind zu und lassen sich per Klick aufklappen
  const firstPhaseContent = timeline.getByText(/Geführte Bewegungen/);
  await expect(firstPhaseContent).toBeHidden();
  await timeline.locator("summary", { hasText: "Woche 1–2" }).click();
  await expect(firstPhaseContent).toBeVisible();

  // … und per Tastatur
  const rebuildContent = timeline.getByText(/Vorsichtige Hängeübungen am Griffboard/);
  await expect(rebuildContent).toBeHidden();
  await timeline.locator("summary", { hasText: "Aufbautraining" }).focus();
  await page.keyboard.press("Enter");
  await expect(rebuildContent).toBeVisible();

  // Meilensteine mit Datum (leichte Aktivität nach 6 Wochen = in 22 Tagen)
  const milestones = timeline.getByRole("listitem").filter({ hasText: "Meilenstein" });
  await expect(milestones).toHaveText([
    new RegExp(`Leichte sportartspezifische Aktivität.*${formatted(daysAgo(-22))}`),
    new RegExp(`Volle sportartspezifische Aktivität.*${formatted(daysAgo(-50))}`),
    /Ende des H-Tape-Schutzes/,
  ]);
  await expect(timeline.getByText("Abgeschlossen")).toBeVisible();
});

test("Zeitleiste kennzeichnet einen abgeschlossenen Plan", async ({ page }) => {
  await login(page);
  // Vor 120 Tagen verletzt: mehr als 3 Monate, Plan abgeschlossen
  await recordGradeTwo(page, daysAgo(120));

  const timeline = page.getByRole("region", { name: "Zeitleiste" });
  const current = timeline.locator('[aria-current="step"]');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText("Abgeschlossen");
  // Keine Phase ist mehr aufgeklappt
  await expect(timeline.locator("details[open]")).toHaveCount(0);
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
