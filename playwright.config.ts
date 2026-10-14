import { defineConfig, devices } from "@playwright/test";
import { execSync } from "node:child_process";

// Eigener Port, damit nie ein laufender Entwicklungsserver (der ggf. mit
// Stage verbunden ist) wiederverwendet wird
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// Die Browser-Tests laufen immer gegen die lokale Supabase, nie gegen Stage
// oder Prod. Adresse und Schlüssel liefert `supabase status`.
function localSupabase() {
  if (process.env.E2E_SUPABASE_URL) {
    return;
  }

  let status: Record<string, string>;
  try {
    status = JSON.parse(
      execSync("npx supabase status -o json", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    throw new Error(
      "Die lokale Supabase läuft nicht. Erst Docker starten, dann `npx supabase start` ausführen.",
    );
  }

  // Wird an die Test-Prozesse vererbt, damit `supabase status` nur einmal läuft
  process.env.E2E_SUPABASE_URL = status.API_URL;
  process.env.E2E_SUPABASE_PUBLISHABLE_KEY = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  process.env.E2E_MAIL_URL = status.MAILPIT_URL ?? status.INBUCKET_URL;
}

localSupabase();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // In der CI darf kein vergessenes test.only durchrutschen
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
    // PulleyPal wird oft am Handy genutzt (z. B. in der Kletterhalle)
    { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // In der CI wird die fertig gebaute App getestet, lokal der Entwicklungsserver
    command: process.env.CI
      ? `npm run build && npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Überschreibt die Werte aus .env.local
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_SUPABASE_PUBLISHABLE_KEY!,
    },
  },
});
