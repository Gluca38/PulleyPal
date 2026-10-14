"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { useToday } from "@/lib/use-today";
import {
  GRADES,
  PROTECTION_TYPES,
  isGrade,
  prescribedDurationFor,
  type Grade,
} from "@/lib/treatment-plan/treatment-plan";
import { changeInjury, saveInjury } from "./actions";
import type { InjuryFormError, InjuryFormState, InjuryFormValues } from "./validate-injury-form";

const initialState: InjuryFormState = { errors: [] };

const emptyValues: InjuryFormValues = {
  grade: "",
  startDate: "",
  prescribedDuration: "",
  protectionType: "",
  confirmed: false,
};

// Erfassen (create) oder Ändern (change) der Verletzung. Beim Ändern ist das
// Formular mit den gespeicherten Werten vorausgefüllt und die Bestätigung
// „ersetzt keine ärztliche Behandlung“ wird nicht erneut verlangt.
export function InjuryForm({
  mode,
  savedValues = emptyValues,
}: {
  mode: "create" | "change";
  savedValues?: InjuryFormValues;
}) {
  const t = useTranslations("Verletzung");
  const today = useToday();
  const [state, formAction, pending] = useActionState(
    mode === "create" ? saveInjury : changeInjury,
    initialState,
  );
  // Nach einem Fehler zeigt das Formular die zuletzt abgeschickten Werte
  const values = state.values ?? savedValues;
  const [grade, setGrade] = useState(values.grade);
  const duration = isGrade(grade) ? prescribedDurationFor(grade) : null;

  function errorFor(...codes: InjuryFormError[]) {
    const code = state.errors.find((error) => codes.includes(error));
    return code ? (
      <p role="alert" className="field-error">
        {t(`fehler.${code}`, { grad: grade })}
      </p>
    ) : null;
  }

  return (
    // Eigene Prüfung auf dem Server statt der Browser-Meldungen, damit alle
    // Texte aus der Sprachdatei kommen
    <form action={formAction} noValidate className="stack">
      <input type="hidden" name="today" value={today ?? ""} />

      <fieldset className="stack-small">
        <legend>{t("gradLegende")}</legend>
        <p className="hint">{t("gradHinweis")}</p>
        {GRADES.map((value) => (
          <label key={value} className="choice">
            <input
              type="radio"
              name="grade"
              value={value}
              checked={grade === value}
              onChange={() => setGrade(value)}
            />
            <span>
              <strong>{t(`grad.${value}.name`)}</strong>
              <br />
              <span className="hint">{t(`grad.${value}.beschreibung`)}</span>
            </span>
          </label>
        ))}
        {errorFor("gradeMissing", "gradeInvalid")}
      </fieldset>

      <div className="stack-small">
        <label htmlFor="startDate">{t("starttagLabel", { grad: grade })}</label>
        <p className="hint" id="startDate-hint">
          {t("starttagHinweis")}
        </p>
        <input
          id="startDate"
          name="startDate"
          type="date"
          max={today ?? undefined}
          defaultValue={values.startDate}
          aria-describedby="startDate-hint"
        />
        {errorFor("startDateMissing", "startDateInFuture")}
      </div>

      {grade === "I" && (
        <fieldset className="stack-small">
          <legend>{t("schutzartLegende")}</legend>
          <p className="hint">{t("schutzartHinweis")}</p>
          {PROTECTION_TYPES.map((value) => (
            <label key={value} className="choice">
              <input
                type="radio"
                name="protectionType"
                value={value}
                defaultChecked={(values.protectionType || "ring") === value}
              />
              <span>{t(`schutzart.${value}`)}</span>
            </label>
          ))}
          {errorFor("protectionTypeInvalid")}
        </fieldset>
      )}

      {duration && (
        <div className="stack-small">
          <label htmlFor="prescribedDuration">{t(`dauerLabel.${grade as Grade}`)}</label>
          <p className="hint" id="prescribedDuration-hint">
            {t("dauerHinweis")}
          </p>
          {/* Die Dauern gelten je Grad: bei einem anderen Grad wieder „Keine Angabe“ */}
          <select
            key={grade}
            id="prescribedDuration"
            name="prescribedDuration"
            defaultValue={grade === values.grade ? values.prescribedDuration : ""}
            aria-describedby="prescribedDuration-hint"
          >
            <option value="">{t("dauerKeineAngabe", { wochen: duration.default })}</option>
            {duration.options.map((weeks) => (
              <option key={weeks} value={weeks}>
                {t("dauerWochen", { wochen: weeks })}
              </option>
            ))}
          </select>
          {errorFor("durationInvalid")}
        </div>
      )}

      {mode === "create" && (
        <div className="stack-small">
          <label className="choice">
            <input type="checkbox" name="confirmed" defaultChecked={values.confirmed} />
            <span>{t("bestaetigung")}</span>
          </label>
          {errorFor("confirmationMissing")}
        </div>
      )}

      {errorFor("saveFailed")}
      <button type="submit" disabled={pending}>
        {pending ? t("speichert") : t(mode === "create" ? "speichern" : "aenderungSpeichern")}
      </button>
    </form>
  );
}
