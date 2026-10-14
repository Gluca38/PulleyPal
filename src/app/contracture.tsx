"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { IsoDate } from "@/lib/treatment-plan/treatment-plan";
import { useToday } from "@/lib/use-today";
import { useFormatDate } from "./format-date";
import { report, switchToGradeFourB, withdraw } from "./kontraktur/actions";
import type { SurgeryFormState } from "./kontraktur/validate-surgery-form";

const notFailed = { failed: false };
const noSurgeryErrors: SurgeryFormState = { errors: [] };

// Grad IV a: unaufdringliche Option, eine Kontraktur zu melden. Die App fragt
// nicht regelmäßig danach (docs/behandlungsschema.md, Abschnitt 3).
export function ReportContracture() {
  const t = useTranslations("Kontraktur");
  const [state, formAction, pending] = useActionState(report, notFailed);

  return (
    <details className="quiet-option">
      <summary>{t("frage")}</summary>
      <form action={formAction} className="stack-small">
        <p>{t("erklaerung")}</p>
        {state.failed && (
          <p role="alert" className="field-error">
            {t("fehler.saveFailed")}
          </p>
        )}
        <div>
          <button type="submit" className="secondary" disabled={pending}>
            {t("melden")}
          </button>
        </div>
      </form>
    </details>
  );
}

// Grad IV a nach gemeldeter Kontraktur: Hinweis, eine OP ärztlich abzuklären,
// Wechsel zu Grad IV b nach der OP und Zurücknehmen der Meldung
export function ContractureNotice({ injuryStartDate }: { injuryStartDate: IsoDate }) {
  const t = useTranslations("Kontraktur");
  const today = useToday();
  const formatDate = useFormatDate();
  const [withdrawState, withdrawAction, withdrawing] = useActionState(withdraw, notFailed);
  const [surgeryState, surgeryAction, switching] = useActionState(
    switchToGradeFourB,
    noSurgeryErrors,
  );
  const surgeryError = surgeryState.errors[0];

  return (
    <section className="card notice stack" aria-labelledby="contracture-heading">
      <div className="stack-small">
        <h2 id="contracture-heading">{t("gemeldetTitel")}</h2>
        <p>{t("gemeldetText")}</p>
      </div>

      {/* Bleibt nach einem Fehler offen, damit die Meldung sichtbar ist */}
      <details className="quiet-option" open={surgeryError ? true : undefined}>
        <summary>{t("operiertTitel")}</summary>
        <form action={surgeryAction} noValidate className="stack-small">
          <input type="hidden" name="today" value={today ?? ""} />
          <p className="hint">{t("operiertHinweis")}</p>
          <label htmlFor="surgeryDate">{t("opTag")}</label>
          <input
            id="surgeryDate"
            name="surgeryDate"
            type="date"
            min={injuryStartDate}
            max={today ?? undefined}
            defaultValue={surgeryState.surgeryDate}
          />
          {surgeryError && (
            <p role="alert" className="field-error">
              {t(`fehler.${surgeryError}`, { datum: formatDate(injuryStartDate) })}
            </p>
          )}
          <div>
            <button type="submit" disabled={switching}>
              {switching ? t("speichert") : t("wechseln")}
            </button>
          </div>
        </form>
      </details>

      <form action={withdrawAction} className="stack-small">
        {withdrawState.failed && (
          <p role="alert" className="field-error">
            {t("fehler.saveFailed")}
          </p>
        )}
        <div>
          <button type="submit" className="secondary" disabled={withdrawing}>
            {t("zuruecknehmen")}
          </button>
        </div>
      </form>
    </section>
  );
}
