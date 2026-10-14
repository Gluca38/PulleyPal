import { expect, type Page } from "@playwright/test";

// Jeder Test bekommt eine eigene Adresse, damit sich parallele Tests
// (Desktop und Handy) nicht gegenseitig die Mails wegnehmen
export function uniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function requestLoginLink(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Login-Link senden" }).click();
  await expect(page.getByRole("status")).toContainText("Link wurde gesendet");
}

// Holt den Login-Link aus dem Mail-Postfach der lokalen Supabase (Mailpit)
export async function fetchLoginLink(email: string): Promise<string> {
  const mailUrl = process.env.E2E_MAIL_URL;
  if (!mailUrl) {
    throw new Error("E2E_MAIL_URL fehlt (siehe playwright.config.ts).");
  }

  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${mailUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
        );
        const { messages } = (await search.json()) as { messages: { ID: string }[] };
        if (!messages?.length) {
          return undefined;
        }

        const message = await fetch(`${mailUrl}/api/v1/message/${messages[0].ID}`);
        const { HTML } = (await message.json()) as { HTML: string };
        link = HTML.match(/href="([^"]*token_hash[^"]*)"/)?.[1]?.replaceAll("&amp;", "&");
        return link;
      },
      { message: `Login-Mail an ${email} ist nicht angekommen`, timeout: 15_000 },
    )
    .toBeTruthy();

  return link!;
}

// Meldet eine neue Person an. Ohne erfasste Verletzung landet sie beim Erfassen.
export async function login(page: Page, email = uniqueEmail()) {
  await requestLoginLink(page, email);
  await page.goto(await fetchLoginLink(email));
  await expect(page).toHaveURL("/verletzung");
  return email;
}
