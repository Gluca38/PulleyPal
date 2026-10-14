import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountBar } from "@/app/account-bar";
import { getInjury } from "@/lib/injury";
import { TodayCard } from "./today-card";

// Geschützte Startseite: zeigt die Heute-Karte zur erfassten Verletzung
export default function Home() {
  const t = useTranslations("Startseite");

  return (
    <main className="page">
      <h1>{t("titel")}</h1>
      <Suspense fallback={null}>
        <TodayCardForInjury />
      </Suspense>
      <Suspense fallback={null}>
        <AccountBar />
      </Suspense>
    </main>
  );
}

// Ohne erfasste Verletzung gibt es keinen Plan: dann zuerst erfassen
async function TodayCardForInjury() {
  const injury = await getInjury();
  if (!injury) {
    redirect("/verletzung");
  }
  return <TodayCard injury={injury} />;
}
