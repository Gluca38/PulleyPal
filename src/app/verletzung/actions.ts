"use server";

import { redirect } from "next/navigation";
import { createInjury, updateInjury } from "@/lib/injury";
import { validateInjuryForm, type InjuryFormState } from "./validate-injury-form";

// Prüft das Formular „Verletzung erfassen“ und legt die Verletzung an
export async function saveInjury(
  _previousState: InjuryFormState,
  formData: FormData,
): Promise<InjuryFormState> {
  const { errors, values, injury } = validateInjuryForm(formData, { requireConfirmation: true });
  if (!injury) {
    return { errors, values };
  }

  const result = await createInjury(injury);
  if (result === "error") {
    return { errors: ["saveFailed"], values };
  }

  redirect("/");
}

// Prüft das Formular „Verletzung ändern“ und überschreibt die Verletzung.
// Der Behandlungsplan wird auf der Startseite daraus neu berechnet.
export async function changeInjury(
  _previousState: InjuryFormState,
  formData: FormData,
): Promise<InjuryFormState> {
  const { errors, values, injury } = validateInjuryForm(formData, { requireConfirmation: false });
  if (!injury) {
    return { errors, values };
  }

  const result = await updateInjury(injury);
  if (result === "error") {
    return { errors: ["saveFailed"], values };
  }
  // Noch nichts erfasst (z. B. in einem anderen Tab gelöscht): dann erfassen
  if (result === "notFound") {
    redirect("/verletzung");
  }

  redirect("/");
}
