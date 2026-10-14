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

// Ändern kommt mit einem eigenen Ticket; bis dahin geht es mit erfasster Verletzung zur Startseite
async function FormUnlessRecorded() {
  if (await getInjury()) {
    redirect("/");
  }
  return <InjuryForm />;
}
