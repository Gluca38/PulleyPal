import { useTranslations } from "next-intl";

const QUESTIONS = ["training", "hTape", "hanging"] as const;

// Grad IV b: dauerhaft sichtbarer Hinweis, die Aufbauphase ärztlich zu klären
// (docs/behandlungsschema.md, Abschnitt 3)
export function ClarifyNotice() {
  const t = useTranslations("Behandlungsplan.klaeren");

  return (
    <section className="card notice stack-small" aria-labelledby="clarify-heading">
      <h2 id="clarify-heading">{t("titel")}</h2>
      <p>{t("einleitung")}</p>
      <ul>
        {QUESTIONS.map((question) => (
          <li key={question}>{t(`frage.${question}`)}</li>
        ))}
      </ul>
    </section>
  );
}
