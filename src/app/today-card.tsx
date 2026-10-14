"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Injury } from "@/lib/injury";
import { calculateTreatmentPlan, type IsoDate, type Rule } from "@/lib/treatment-plan/treatment-plan";
import { useToday } from "@/lib/use-today";

const RULE_TYPES: Rule["type"][] = ["forbidden", "allowed", "reminder"];

// Heute-Karte: wo die Person heute in ihrem Behandlungsplan steht.
// Läuft im Browser, weil „heute“ das Datum des Geräts ist (siehe useToday).
export function TodayCard({ injury }: { injury: Injury }) {
  const t = useTranslations("Behandlungsplan");
  const locale = useLocale();
  const today = useToday();

  if (!today) {
    return null;
  }

  const { status } = calculateTreatmentPlan({ ...injury, today });
  const formatDate = (date: IsoDate) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(`${date}T00:00:00Z`),
    );

  if (status.kind === "completed") {
    return (
      <section className="card" aria-labelledby="today-heading">
        <h2 id="today-heading">{t("abgeschlossen")}</h2>
        <p>{t("abgeschlossenText")}</p>
      </section>
    );
  }

  const { phase, nextMilestone } = status;

  return (
    <section className="card stack" aria-labelledby="today-heading">
      <div>
        <h2 id="today-heading" className="eyebrow">
          {t("heute")}
        </h2>
        <p className="week">{t("woche", { woche: status.week, gesamt: status.totalWeeks })}</p>
      </div>

      <div className="stack-small">
        <h3>{t(`phase.${phase.content}.name`)}</h3>
        <p className="hint">
          {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
        </p>
        <p>{t(`phase.${phase.content}.inhalt`)}</p>
      </div>

      {RULE_TYPES.map((type) => {
        const rules = status.rules.filter((rule) => rule.type === type);
        if (rules.length === 0) return null;
        return (
          <div key={type} className={`rules rules-${type}`}>
            <h3>{t(`regelArt.${type}`)}</h3>
            <ul>
              {rules.map((rule) => (
                <li key={rule.key}>
                  {t(`regel.${rule.key}`, { datum: rule.date ? formatDate(rule.date) : "" })}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {nextMilestone && (
        <div className="milestone">
          <h3>{t("naechsterMeilenstein")}</h3>
          <p>{t(`meilenstein.${nextMilestone.kind}`)}</p>
          <p>
            {t("meilensteinAm", {
              datum: formatDate(nextMilestone.date),
              tage: nextMilestone.daysUntil,
            })}
          </p>
        </div>
      )}
    </section>
  );
}
