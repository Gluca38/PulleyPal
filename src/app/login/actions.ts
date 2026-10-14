"use server";

import { headers } from "next/headers";
import { getRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

export type LoginLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "invalid" }
  | { status: "error" };

// Schickt den Login-Link per E-Mail. Die Rücksprungadresse ist immer die
// aktuelle Domain, damit Vorschau, Stage und Prod gleichermaßen funktionieren.
export async function requestLoginLink(
  _previousState: LoginLinkState,
  formData: FormData,
): Promise<LoginLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) {
    return { status: "invalid" };
  }

  const origin = getRequestOrigin(await headers());
  if (!origin) {
    return { status: "error" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    console.error("Login-Link konnte nicht gesendet werden:", error.message);
    return { status: "error" };
  }

  return { status: "sent", email };
}
