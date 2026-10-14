import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountBar } from "@/app/account-bar";
import { getInjury } from "@/lib/injury";
import { InjuryForm } from "./injury-form";

// Verletzung erfassen. Neue Personen landen nach dem ersten Login hier.
export default function RecordInjuryPage() {
  const t = useTranslations("Verletzung");

  return (
    <main className="page">
      <h1>{t("titel")}</h1>
      <p>{t("einleitung")}</p>
      <Suspense fallback={null}>
        <FormUnlessRecorded />
      </Suspense>
      <Suspense fallback={null}>
        <AccountBar />
      </Suspense>
    </main>
  );
}

// Mit erfasster Verletzung geht es zur Startseite; dort lässt sie sich ändern
async function FormUnlessRecorded() {
  if (await getInjury()) {
    redirect("/");
  }
  return <InjuryForm mode="create" />;
}
