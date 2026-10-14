"use server";

import { redirect } from "next/navigation";
import { createInjury } from "@/lib/injury";
import { addDays, daysBetween } from "@/lib/treatment-plan/dates";
import {
  SUPPORTED_GRADES,
  prescribedDurationFor,
  type Grade,
} from "@/lib/treatment-plan/treatment-plan";

export type InjuryFormError =
  | "gradeMissing"
  | "gradeNotSupported"
  | "startDateMissing"
  | "startDateInFuture"
  | "durationInvalid"
  | "confirmationMissing"
  | "saveFailed";

export type InjuryFormValues = {
  grade: string;
  startDate: string;
  prescribedDuration: string;
  confirmed: boolean;
};

export type InjuryFormState = {
  errors: InjuryFormError[];
  values?: InjuryFormValues;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isGrade(value: string): value is Grade {
  return (SUPPORTED_GRADES as string[]).includes(value);
}

// Spätester erlaubter Starttag. Das Formular schickt das heutige Datum des
// Geräts mit, damit „nicht in der Zukunft“ in der Zeitzone der Person gilt.
// Weicht es mehr als einen Tag vom Server ab, gilt das Serverdatum (UTC).
function latestStartDate(deviceToday: string) {
  const serverToday = new Date().toISOString().slice(0, 10);
  if (ISO_DATE.test(deviceToday) && Math.abs(daysBetween(serverToday, deviceToday)) <= 1) {
    return deviceToday;
  }
  return serverToday;
}

function isValidDate(value: string) {
  // Abgleich hin und zurück erkennt Tage wie den 31. Februar
  return ISO_DATE.test(value) && addDays(value, 0) === value;
}

// Prüft das Formular „Verletzung erfassen“ und legt die Verletzung an
export async function saveInjury(
  _previousState: InjuryFormState,
  formData: FormData,
): Promise<InjuryFormState> {
  const values: InjuryFormValues = {
    grade: String(formData.get("grade") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    prescribedDuration: String(formData.get("prescribedDuration") ?? ""),
    confirmed: formData.get("confirmed") === "on",
  };
  const errors: InjuryFormError[] = [];

  if (!values.grade) {
    errors.push("gradeMissing");
  } else if (!isGrade(values.grade)) {
    errors.push("gradeNotSupported");
  }

  if (!values.startDate || !isValidDate(values.startDate)) {
    errors.push("startDateMissing");
  } else if (values.startDate > latestStartDate(String(formData.get("today") ?? ""))) {
    errors.push("startDateInFuture");
  }

  let prescribedDurationWeeks: number | null = null;
  if (values.prescribedDuration && isGrade(values.grade)) {
    prescribedDurationWeeks = Number(values.prescribedDuration);
    if (!prescribedDurationFor(values.grade)?.options.includes(prescribedDurationWeeks)) {
      errors.push("durationInvalid");
    }
  }

  if (!values.confirmed) {
    errors.push("confirmationMissing");
  }

  if (errors.length > 0 || !isGrade(values.grade)) {
    return { errors, values };
  }

  const result = await createInjury({
    grade: values.grade,
    startDate: values.startDate,
    prescribedDurationWeeks,
  });
  if (result === "error") {
    return { errors: ["saveFailed"], values };
  }

  redirect("/");
}
