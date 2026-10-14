import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getSupabaseConfig } from "./config";

// Supabase-Zugang für Server-Komponenten, Server-Aktionen und Route-Handler.
// Die Anmeldung steckt in Cookies, damit der Server weiß, wer eingeloggt ist.
export async function createClient() {
  // Supabase prüft beim Laden der Anmeldung die aktuelle Uhrzeit. Das darf erst
  // bei einem echten Seitenaufruf passieren, nicht beim Vorab-Rendern.
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // In Server-Komponenten dürfen keine Cookies gesetzt werden.
          // Das ist unkritisch: src/proxy.ts frischt die Anmeldung bei jedem Aufruf auf.
        }
      },
    },
  });
}
