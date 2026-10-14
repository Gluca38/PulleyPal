import { useTranslations } from "next-intl";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountBar } from "@/app/account-bar";
import { getInjury, type Injury } from "@/lib/injury";
import { InjuryForm } from "../injury-form";
import type { InjuryFormValues } from "../validate-injury-form";

// Verletzung ändern. Die gespeicherte Verletzung wird überschrieben (kein Verlauf).
export default function ChangeInjuryPage() {
  const t = useTranslations("Verletzung");

  return (
    <main className="page">
      <h1>{t("aendernTitel")}</h1>
      <p>{t("aendernEinleitung")}</p>
      <Suspense fallback={null}>
        <FormWithSavedInjury />
      </Suspense>
      <p>
        <Link href="/" className="text-link">
          {t("abbrechen")}
        </Link>
      </p>
      <Suspense fallback={null}>
        <AccountBar />
      </Suspense>
    </main>
  );
}

// Ohne erfasste Verletzung gibt es nichts zu ändern: dann zuerst erfassen
async function FormWithSavedInjury() {
  const injury = await getInjury();
  if (!injury) {
    redirect("/verletzung");
  }
  return <InjuryForm mode="change" savedValues={formValuesOf(injury)} />;
}

function formValuesOf(injury: Injury): InjuryFormValues {
  return {
    grade: injury.grade,
    startDate: injury.startDate,
    prescribedDuration: injury.prescribedDurationWeeks?.toString() ?? "",
    protectionType: injury.protectionType ?? "",
    confirmed: true,
  };
}
