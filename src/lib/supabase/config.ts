// Adresse und öffentlicher Schlüssel der Supabase. Beides legt die
// Vercel-Supabase-Verknüpfung als Umgebungsvariablen an (lokal: .env.local,
// in den Browser-Tests: die lokale Supabase, siehe playwright.config.ts).
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY müssen gesetzt sein.",
    );
  }

  return { url, publishableKey };
}
