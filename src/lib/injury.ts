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

// Die gespeicherte Verletzung samt Kontraktur-Meldung (nur Grad IV a)
export type SavedInjury = Injury & { contractureReported: boolean };

// Schutzart im Code und in der Datenbank (Spalte protection_type)
const PROTECTION_TYPE_IN_DB: Record<ProtectionType, string> = { ring: "ring", hTape: "h_tape" };

function protectionTypeFromDb(value: string | null): ProtectionType | null {
  const entry = Object.entries(PROTECTION_TYPE_IN_DB).find(([, inDb]) => inDb === value);
  return entry ? (entry[0] as ProtectionType) : null;
}

// Spalten der Tabelle injuries zu einer Verletzung
function injuryToRow(injury: Injury) {
  return {
    grade: injury.grade,
    start_date: injury.startDate,
    prescribed_duration_weeks: injury.prescribedDurationWeeks,
    protection_type: injury.protectionType ? PROTECTION_TYPE_IN_DB[injury.protectionType] : null,
  };
}

// Liefert die Verletzung der eingeloggten Person oder null, wenn noch keine erfasst ist
export async function getInjury(): Promise<SavedInjury | null> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("injuries")
    .select("grade, start_date, prescribed_duration_weeks, protection_type, contracture_reported_at")
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
    contractureReported: data.contracture_reported_at !== null,
  };
}

export type CreateInjuryResult = "created" | "alreadyExists" | "error";

// Legt die Verletzung an. Die Person hat dabei bestätigt, dass die App keine
// ärztliche Behandlung ersetzt; der Zeitpunkt wird mitgespeichert.
export async function createInjury(injury: Injury): Promise<CreateInjuryResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("injuries").insert({
    ...injuryToRow(injury),
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

export type UpdateInjuryResult = "updated" | "notFound" | "error";

// Überschreibt die Verletzung der eingeloggten Person (kein Verlauf). Die
// Bestätigung vom Erfassen bleibt bestehen. Eine gemeldete Kontraktur gibt es
// nur bei Grad IV a und entfällt bei einem anderen Grad. Mit onlyIfGrade wird
// nur überschrieben, wenn noch dieser Grad gespeichert ist (sonst notFound).
export async function updateInjury(
  injury: Injury,
  { onlyIfGrade }: { onlyIfGrade?: Grade } = {},
): Promise<UpdateInjuryResult> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  let query = supabase
    .from("injuries")
    .update({
      ...injuryToRow(injury),
      ...(injury.grade === "IVa" ? {} : { contracture_reported_at: null }),
    })
    .eq("user_id", user.id);
  if (onlyIfGrade) {
    query = query.eq("grade", onlyIfGrade);
  }
  const { data, error } = await query.select("user_id");

  if (error) {
    console.error("Verletzung konnte nicht geändert werden:", error.message);
    return "error";
  }
  return data.length > 0 ? "updated" : "notFound";
}

// Meldet eine Kontraktur oder nimmt die Meldung zurück. Nur bei Grad IV a;
// bei einem anderen Grad (z. B. in einem anderen Tab geändert) passiert nichts.
export async function setContractureReported(reported: boolean): Promise<UpdateInjuryResult> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("injuries")
    .update({ contracture_reported_at: reported ? new Date().toISOString() : null })
    .eq("user_id", user.id)
    .eq("grade", "IVa")
    .select("user_id");

  if (error) {
    console.error("Kontraktur-Meldung konnte nicht gespeichert werden:", error.message);
    return "error";
  }
  return data.length > 0 ? "updated" : "notFound";
}
