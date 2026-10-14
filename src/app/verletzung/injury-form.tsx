"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { useToday } from "@/lib/use-today";
import {
  GRADES,
  PROTECTION_TYPES,
  prescribedDurationFor,
  type Grade,
} from "@/lib/treatment-plan/treatment-plan";
import { saveInjury, type InjuryFormError, type InjuryFormState } from "./actions";

const initialState: InjuryFormState = { errors: [] };

function isGrade(value: string): value is Grade {
  return (GRADES as readonly string[]).includes(value);
}

export function InjuryForm() {
  const t = useTranslations("Verletzung");
  const today = useToday();
  const [state, formAction, pending] = useActionState(saveInjury, initialState);
  const [grade, setGrade] = useState(state.values?.grade ?? "");
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
          defaultValue={state.values?.startDate}
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
                defaultChecked={(state.values?.protectionType || "ring") === value}
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
          <select
            id="prescribedDuration"
            name="prescribedDuration"
            defaultValue={state.values?.prescribedDuration ?? ""}
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

      <div className="stack-small">
        <label className="choice">
          <input type="checkbox" name="confirmed" defaultChecked={state.values?.confirmed} />
          <span>{t("bestaetigung")}</span>
        </label>
        {errorFor("confirmationMissing")}
      </div>

      {errorFor("saveFailed")}
      <button type="submit" disabled={pending}>
        {pending ? t("speichert") : t("speichern")}
      </button>
    </form>
  );
}
