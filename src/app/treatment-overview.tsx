"use client";

import type { Injury } from "@/lib/injury";
import { calculateTreatmentPlan } from "@/lib/treatment-plan/treatment-plan";
import { useToday } from "@/lib/use-today";
import { ClarifyNotice } from "./clarify-notice";
import { Timeline } from "./timeline";
import { TodayCard } from "./today-card";

// Heute-Karte und Zeitleiste zum Behandlungsplan der Person.
// Läuft im Browser, weil „heute“ das Datum des Geräts ist (siehe useToday).
export function TreatmentOverview({ injury }: { injury: Injury }) {
  const today = useToday();
  if (!today) {
    return null;
  }

  const plan = calculateTreatmentPlan({ ...injury, today });
  return (
    <>
      <TodayCard status={plan.status} />
      {plan.clarifyWithSurgeon && <ClarifyNotice />}
      <Timeline plan={plan} />
    </>
  );
}
