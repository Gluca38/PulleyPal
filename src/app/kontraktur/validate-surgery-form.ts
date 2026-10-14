import type { IsoDate } from "@/lib/treatment-plan/treatment-plan";
import { isValidDate, latestStartDate } from "@/lib/treatment-plan/dates";

export type SurgeryFormError =
  | "surgeryDateMissing"
  | "surgeryDateInFuture"
  | "surgeryDateBeforeStartDate"
  | "saveFailed";

export type SurgeryFormState = {
  errors: SurgeryFormError[];
  // zuletzt eingegebener Tag, damit er nach einem Fehler stehen bleibt
  surgeryDate?: string;
};

// Prüft „Ich wurde operiert“: Der Tag der OP wird der neue Starttag für Grad IV b.
// Er liegt nicht in der Zukunft und nicht vor dem bisherigen Starttag (Tag der Verletzung).
export function validateSurgeryForm(
  formData: FormData,
  {
    injuryStartDate,
    serverToday = new Date().toISOString().slice(0, 10),
  }: { injuryStartDate: IsoDate; serverToday?: string },
): { errors: SurgeryFormError[]; surgeryDate: IsoDate | null } {
  const surgeryDate = String(formData.get("surgeryDate") ?? "");
  const deviceToday = String(formData.get("today") ?? "");

  let error: SurgeryFormError | null = null;
  if (!surgeryDate || !isValidDate(surgeryDate)) {
    error = "surgeryDateMissing";
  } else if (surgeryDate > latestStartDate(deviceToday, serverToday)) {
    error = "surgeryDateInFuture";
  } else if (surgeryDate < injuryStartDate) {
    error = "surgeryDateBeforeStartDate";
  }

  return error ? { errors: [error], surgeryDate: null } : { errors: [], surgeryDate };
}
