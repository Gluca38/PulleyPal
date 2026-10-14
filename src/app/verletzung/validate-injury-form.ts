import type { Injury } from "@/lib/injury";
import { addDays, daysBetween } from "@/lib/treatment-plan/dates";
import {
  PROTECTION_TYPES,
  isGrade,
  prescribedDurationFor,
  type ProtectionType,
} from "@/lib/treatment-plan/treatment-plan";

export type InjuryFormError =
  | "gradeMissing"
  | "gradeInvalid"
  | "startDateMissing"
  | "startDateInFuture"
  | "durationInvalid"
  | "protectionTypeInvalid"
  | "confirmationMissing"
  | "saveFailed";

export type InjuryFormValues = {
  grade: string;
  startDate: string;
  prescribedDuration: string;
  protectionType: string;
  confirmed: boolean;
};

export type InjuryFormState = {
  errors: InjuryFormError[];
  values?: InjuryFormValues;
};

export type InjuryFormValidation = {
  errors: InjuryFormError[];
  values: InjuryFormValues;
  // nur gesetzt, wenn es keine Fehler gibt
  injury: Injury | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isProtectionType(value: string): value is ProtectionType {
  return (PROTECTION_TYPES as readonly string[]).includes(value);
}

// Spätester erlaubter Starttag. Das Formular schickt das heutige Datum des
// Geräts mit, damit „nicht in der Zukunft“ in der Zeitzone der Person gilt.
// Weicht es mehr als einen Tag vom Server ab, gilt das Serverdatum (UTC).
export function latestStartDate(deviceToday: string, serverToday: string) {
  if (ISO_DATE.test(deviceToday) && Math.abs(daysBetween(serverToday, deviceToday)) <= 1) {
    return deviceToday;
  }
  return serverToday;
}

export function isValidDate(value: string) {
  // Abgleich hin und zurück erkennt Tage wie den 31. Februar
  return ISO_DATE.test(value) && addDays(value, 0) === value;
}

// Prüft das Formular „Verletzung erfassen“ bzw. „Verletzung ändern“. Die
// Bestätigung „ersetzt keine ärztliche Behandlung“ gibt es nur beim Erfassen.
export function validateInjuryForm(
  formData: FormData,
  {
    requireConfirmation,
    serverToday = new Date().toISOString().slice(0, 10),
  }: { requireConfirmation: boolean; serverToday?: string },
): InjuryFormValidation {
  const values: InjuryFormValues = {
    grade: String(formData.get("grade") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    prescribedDuration: String(formData.get("prescribedDuration") ?? ""),
    protectionType: String(formData.get("protectionType") ?? ""),
    confirmed: formData.get("confirmed") === "on",
  };
  const errors: InjuryFormError[] = [];

  if (!values.grade) {
    errors.push("gradeMissing");
  } else if (!isGrade(values.grade)) {
    errors.push("gradeInvalid");
  }

  const deviceToday = String(formData.get("today") ?? "");
  if (!values.startDate || !isValidDate(values.startDate)) {
    errors.push("startDateMissing");
  } else if (values.startDate > latestStartDate(deviceToday, serverToday)) {
    errors.push("startDateInFuture");
  }

  let prescribedDurationWeeks: number | null = null;
  if (values.prescribedDuration && isGrade(values.grade)) {
    prescribedDurationWeeks = Number(values.prescribedDuration);
    if (!prescribedDurationFor(values.grade)?.options.includes(prescribedDurationWeeks)) {
      errors.push("durationInvalid");
    }
  }

  // Schutzart nur bei Grad I; ohne Angabe gilt der Ring
  let protectionType: ProtectionType | null = null;
  if (values.grade === "I") {
    if (!values.protectionType) {
      protectionType = "ring";
    } else if (isProtectionType(values.protectionType)) {
      protectionType = values.protectionType;
    } else {
      errors.push("protectionTypeInvalid");
    }
  }

  if (requireConfirmation && !values.confirmed) {
    errors.push("confirmationMissing");
  }

  if (errors.length > 0 || !isGrade(values.grade)) {
    return { errors, values, injury: null };
  }

  return {
    errors,
    values,
    injury: {
      grade: values.grade,
      startDate: values.startDate,
      prescribedDurationWeeks,
      protectionType,
    },
  };
}
