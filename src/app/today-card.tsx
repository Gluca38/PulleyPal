"use client";

import { useTranslations } from "next-intl";
import type { Rule, TodayStatus } from "@/lib/treatment-plan/treatment-plan";
import { useFormatDate } from "./format-date";

const RULE_TYPES: Rule["type"][] = ["forbidden", "allowed", "reminder"];

// Heute-Karte: wo die Person heute in ihrem Behandlungsplan steht
export function TodayCard({ status }: { status: TodayStatus }) {
  const t = useTranslations("Behandlungsplan");
  const formatDate = useFormatDate();

  if (status.kind === "completed") {
    return (
      <section className="card" aria-labelledby="today-heading">
        <h2 id="today-heading">{t("abgeschlossen")}</h2>
        <p>{t("abgeschlossenText")}</p>
        {status.permanentTaping && <p>{t("dauerhaftTapen")}</p>}
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
          {t("zeitraum", { start: formatDate(phase.startDate), ende: formatDate(phase.endDate) })}
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
