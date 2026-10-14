import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
};

// Liefert die eingeloggte Person. Gäste werden zum Login umgeleitet.
// src/proxy.ts leitet zwar schon vorher um, jede geschützte Seite prüft
// aber zusätzlich selbst (die Next.js-Doku empfiehlt das ausdrücklich).
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return { id: data.claims.sub, email: data.claims.email ?? "" };
}
