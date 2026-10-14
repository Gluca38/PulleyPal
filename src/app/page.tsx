import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("Startseite");

  return (
    <main>
      <h1>{t("titel")}</h1>
      <p>{t("beschreibung")}</p>
    </main>
  );
}
