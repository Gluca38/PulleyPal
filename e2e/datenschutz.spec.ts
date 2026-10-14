import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { fetchLoginLink, uniqueEmail } from "./login-helpers";

// Prüft die Zugriffsregeln der Datenbank direkt, so wie es jemand mit dem
// öffentlichen Schlüssel und einer eigenen Anmeldung versuchen könnte.
async function signedInClient() {
  const client = createClient(
    process.env.E2E_SUPABASE_URL!,
    process.env.E2E_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const email = uniqueEmail();

  const { error: otpError } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: "http://localhost:3100/auth/confirm" },
  });
  expect(otpError).toBeNull();

  const tokenHash = new URL(await fetchLoginLink(email)).searchParams.get("token_hash")!;
  const { data, error } = await client.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  expect(error).toBeNull();

  return { client, userId: data.user!.id };
}

const injury = {
  grade: "II",
  start_date: "2026-01-01",
  disclaimer_confirmed_at: new Date().toISOString(),
};

// Die Datenbank wird nur einmal gebraucht, nicht je Gerät
test.skip(({ isMobile }) => isMobile, "Prüft nur die Datenbank, kein Gerät nötig");

test("Person A sieht und ändert die Verletzung von Person B nicht", async () => {
  const a = await signedInClient();
  const b = await signedInClient();

  const { error: insertError } = await b.client.from("injuries").insert(injury);
  expect(insertError).toBeNull();

  // Lesen: A sieht nur die eigene (noch leere) Verletzung
  const { data: visibleToA } = await a.client.from("injuries").select("user_id");
  expect(visibleToA).toEqual([]);

  // Ändern und Löschen: keine Wirkung auf die Zeile von B
  const { data: updated } = await a.client
    .from("injuries")
    .update({ start_date: "2025-01-01" })
    .eq("user_id", b.userId)
    .select();
  expect(updated).toEqual([]);
  const { data: deleted } = await a.client
    .from("injuries")
    .delete()
    .eq("user_id", b.userId)
    .select();
  expect(deleted).toEqual([]);

  // Anlegen im Namen von B wird abgelehnt
  const { error: foreignInsert } = await a.client
    .from("injuries")
    .insert({ ...injury, user_id: b.userId });
  expect(foreignInsert).not.toBeNull();

  // B sieht die eigene Verletzung unverändert
  const { data: visibleToB } = await b.client.from("injuries").select("user_id, start_date");
  expect(visibleToB).toEqual([{ user_id: b.userId, start_date: "2026-01-01" }]);
});

test("Gäste ohne Anmeldung sehen keine Verletzungen", async () => {
  const guest = createClient(
    process.env.E2E_SUPABASE_URL!,
    process.env.E2E_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await guest.from("injuries").select("user_id");

  // Ohne Rechte meldet die Datenbank einen Fehler statt Daten
  expect(data).toBeNull();
  expect(error).not.toBeNull();
});
