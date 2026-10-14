import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { INVALID_LINK_ERROR } from "@/app/login/invalid-link";
import { createClient } from "@/lib/supabase/server";

// Ziel des Login-Links aus der E-Mail. Prüft den Link bei Supabase und
// meldet die Person an. Der Link funktioniert auch in einem anderen Browser
// als dem, in dem er angefordert wurde (z. B. Mail-App am Handy).
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      redirect("/");
    }
  }

  // Abgelaufen, schon benutzt oder unvollständig
  redirect(`/login?fehler=${INVALID_LINK_ERROR}`);
}
