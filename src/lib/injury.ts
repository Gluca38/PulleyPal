import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Grade, IsoDate, ProtectionType } from "@/lib/treatment-plan/treatment-plan";

// Die erfasste Verletzung der eingeloggten Person (Tabelle public.injuries)
export type Injury = {
  grade: Grade;
  startDate: IsoDate;
  // leer = längerer, vorsichtigerer Wert laut Behandlungsschema
  prescribedDurationWeeks: number | null;
  // nur Grad I; leer = Ring
  protectionType: ProtectionType | null;
};

// Schutzart im Code und in der Datenbank (Spalte protection_type)
const PROTECTION_TYPE_IN_DB: Record<ProtectionType, string> = { ring: "ring", hTape: "h_tape" };

function protectionTypeFromDb(value: string | null): ProtectionType | null {
  const entry = Object.entries(PROTECTION_TYPE_IN_DB).find(([, inDb]) => inDb === value);
  return entry ? (entry[0] as ProtectionType) : null;
}

// Liefert die Verletzung der eingeloggten Person oder null, wenn noch keine erfasst ist
export async function getInjury(): Promise<Injury | null> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("injuries")
    .select("grade, start_date, prescribed_duration_weeks, protection_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Verletzung konnte nicht geladen werden: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return {
    grade: data.grade,
    startDate: data.start_date,
    prescribedDurationWeeks: data.prescribed_duration_weeks,
    protectionType: protectionTypeFromDb(data.protection_type),
  };
}

export type CreateInjuryResult = "created" | "alreadyExists" | "error";

// Legt die Verletzung an. Die Person hat dabei bestätigt, dass die App keine
// ärztliche Behandlung ersetzt; der Zeitpunkt wird mitgespeichert.
export async function createInjury(injury: Injury): Promise<CreateInjuryResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("injuries").insert({
    grade: injury.grade,
    start_date: injury.startDate,
    prescribed_duration_weeks: injury.prescribedDurationWeeks,
    protection_type: injury.protectionType ? PROTECTION_TYPE_IN_DB[injury.protectionType] : null,
    disclaimer_confirmed_at: new Date().toISOString(),
  });

  if (!error) {
    return "created";
  }
  // Es gibt schon eine Zeile für die Person (z. B. Formular doppelt abgeschickt)
  if (error.code === "23505") {
    return "alreadyExists";
  }

  console.error("Verletzung konnte nicht gespeichert werden:", error.message);
  return "error";
}
