import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountBar } from "@/app/account-bar";
import { getInjury } from "@/lib/injury";
import { TreatmentOverview } from "./treatment-overview";

// Geschützte Startseite: Heute-Karte und Zeitleiste zur erfassten Verletzung
export default function Home() {
  const t = useTranslations("Startseite");

  return (
    <main className="page">
      <h1>{t("titel")}</h1>
      <Suspense fallback={null}>
        <OverviewForInjury />
      </Suspense>
      <Suspense fallback={null}>
        <AccountBar />
      </Suspense>
    </main>
  );
}

// Ohne erfasste Verletzung gibt es keinen Plan: dann zuerst erfassen
async function OverviewForInjury() {
  const injury = await getInjury();
  if (!injury) {
    redirect("/verletzung");
  }
  const t = await getTranslations("Startseite");
  return (
    <>
      <TreatmentOverview injury={injury} />
      <p>
        <Link href="/verletzung/aendern" className="text-link">
          {t("verletzungAendern")}
        </Link>
      </p>
    </>
  );
}
