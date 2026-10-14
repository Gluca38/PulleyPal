"use client";

import { useTranslations } from "next-intl";
import type { Milestone, Phase, TreatmentPlan } from "@/lib/treatment-plan/treatment-plan";
import { useFormatDate } from "./format-date";

type Entry = { type: "phase"; phase: Phase } | { type: "milestone"; milestone: Milestone };

// Phasen und Meilensteine in zeitlicher Reihenfolge. Ein Meilenstein steht vor
// der Phase, die am selben Tag beginnt (z. B. volle Aktivität vor der Schutzphase).
function entriesInOrder(plan: TreatmentPlan): Entry[] {
  const dated = [
    ...plan.milestones.map((milestone) => ({
      date: milestone.date,
      order: 0,
      entry: { type: "milestone", milestone } as const,
    })),
    ...plan.phases.map((phase) => ({
      date: phase.startDate,
      order: 1,
      entry: { type: "phase", phase } as const,
    })),
  ];
  return dated
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
    .map(({ entry }) => entry);
}

// Zeitleiste aller Phasen: die aktuelle hervorgehoben und aufgeklappt, die
// anderen per Klick oder Tastatur aufklappbar (<details> kann das von Haus aus).
export function Timeline({ plan }: { plan: TreatmentPlan }) {
  const t = useTranslations("Behandlungsplan");
  const formatDate = useFormatDate();
  const currentPhase = plan.status.kind === "active" ? plan.status.phase : null;
  const completed = plan.status.kind === "completed";

  return (
    <section className="stack-small" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">{t("zeitleiste")}</h2>
      <ol className="timeline">
        {entriesInOrder(plan).map((entry) => {
          if (entry.type === "milestone") {
            const { milestone } = entry;
            return (
              <li key={`milestone-${milestone.kind}`} className="timeline-milestone">
                <span className="eyebrow">{t("meilensteinLabel")}</span>
                <span>{t(`meilenstein.${milestone.kind}`)}</span>
                <span className="hint">{t("ab", { datum: formatDate(milestone.date) })}</span>
              </li>
            );
          }

          const { phase } = entry;
          const isCurrent = phase.content === currentPhase?.content;
          return (
            <li
              key={`phase-${phase.content}`}
              className="timeline-phase"
              aria-current={isCurrent ? "step" : undefined}
            >
              <details open={isCurrent}>
                <summary>
                  <span className="timeline-title">{t(`phase.${phase.content}.name`)}</span>
                  {isCurrent && <span className="badge-current">{t("aktuell")}</span>}
                  <span className="hint">
                    {t("zeitraum", {
                      start: formatDate(phase.startDate),
                      ende: formatDate(phase.endDate),
                    })}
                  </span>
                </summary>
                <p>{t(`phase.${phase.content}.inhalt`)}</p>
              </details>
            </li>
          );
        })}
        <li
          className="timeline-completed"
          aria-current={completed ? "step" : undefined}
        >
          <span className="timeline-title">{t("abgeschlossen")}</span>
          {completed && <span className="badge-current">{t("aktuell")}</span>}
          <span className="hint">{t("ab", { datum: formatDate(plan.completedDate) })}</span>
        </li>
      </ol>
    </section>
  );
}
