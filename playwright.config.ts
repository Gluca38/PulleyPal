import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

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
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
