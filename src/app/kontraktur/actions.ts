"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getInjury, setContractureReported, updateInjury } from "@/lib/injury";
import { validateSurgeryForm, type SurgeryFormState } from "./validate-surgery-form";

export type ContractureFormState = { failed: boolean };

// Kontraktur melden (true) oder Meldung zurücknehmen (false). Die Startseite
// wird danach neu geladen und zeigt den Hinweis bzw. wieder die Option.
async function reportContracture(reported: boolean): Promise<ContractureFormState> {
  const result = await setContractureReported(reported);
  if (result === "error") {
    return { failed: true };
  }
  // notFound: inzwischen kein Grad IV a mehr, die Startseite zeigt den aktuellen Stand
  refresh();
  return { failed: false };
}

export async function report(): Promise<ContractureFormState> {
  return reportContracture(true);
}

export async function withdraw(): Promise<ContractureFormState> {
  return reportContracture(false);
}

// „Ich wurde operiert“: Die Verletzung wird auf Grad IV b mit dem Tag der OP als
// Starttag umgestellt. Verordnete Dauer und Kontraktur-Meldung entfallen.
export async function switchToGradeFourB(
  _previousState: SurgeryFormState,
  formData: FormData,
): Promise<SurgeryFormState> {
  const injury = await getInjury();
  if (!injury) {
    redirect("/verletzung");
  }
  // Inzwischen kein Grad IV a mehr (z. B. in einem anderen Tab geändert)
  if (injury.grade !== "IVa") {
    redirect("/");
  }

  const { errors, surgeryDate } = validateSurgeryForm(formData, {
    injuryStartDate: injury.startDate,
  });
  if (!surgeryDate) {
    return { errors, surgeryDate: String(formData.get("surgeryDate") ?? "") };
  }

  // Nur, solange noch Grad IV a gespeichert ist; sonst zeigt die Startseite
  // den aktuellen Stand (notFound)
  const result = await updateInjury(
    { grade: "IVb", startDate: surgeryDate, prescribedDurationWeeks: null, protectionType: null },
    { onlyIfGrade: "IVa" },
  );
  if (result === "error") {
    return { errors: ["saveFailed"], surgeryDate };
  }

  // Die Seite „Verletzung ändern“ soll den neuen Grad zeigen (siehe changeInjury)
  revalidatePath("/verletzung/aendern");
  redirect("/");
}
