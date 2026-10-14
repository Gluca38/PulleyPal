import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { logout } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";

// Geschützte Startseite: nur für eingeloggte Personen (vorerst einfach gehalten)
export default function Home() {
  const t = useTranslations("Startseite");

  return (
    <main>
      <h1>{t("titel")}</h1>
      <p>{t("beschreibung")}</p>
      <Suspense fallback={null}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const user = await getCurrentUser();
  const t = await getTranslations("Startseite");

  return (
    <>
      <p>{t("angemeldetAls", { email: user.email })}</p>
      <form action={logout}>
        <button type="submit">{t("abmelden")}</button>
      </form>
    </>
  );
}
