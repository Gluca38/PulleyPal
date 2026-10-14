import { getRequestConfig } from "next-intl/server";

// Alle Texte der App stehen in messages/<sprache>.json (vorerst nur de.json).
// Neue Texte dort unter einem passenden Bereich eintragen und im Code mit
// useTranslations("Bereich") bzw. getTranslations("Bereich") abrufen.
export const standardSprache = "de";

export default getRequestConfig(async () => {
  const locale = standardSprache;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
