"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Meldet nur dieses Gerät ab, andere Geräte der Person bleiben angemeldet.
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
