"use client";

import { contractureStatus } from "@/lib/contracture";
import type { SavedInjury } from "@/lib/injury";
import { calculateTreatmentPlan } from "@/lib/treatment-plan/treatment-plan";
import { useToday } from "@/lib/use-today";
import { ClarifyNotice } from "./clarify-notice";
import { ContractureNotice, ReportContracture } from "./kontraktur/contracture";
import { Timeline } from "./timeline";
import { TodayCard } from "./today-card";

// Heute-Karte und Zeitleiste zum Behandlungsplan der Person.
// Läuft im Browser, weil „heute“ das Datum des Geräts ist (siehe useToday).
export function TreatmentOverview({ injury }: { injury: SavedInjury }) {
  const today = useToday();
  if (!today) {
    return null;
  }

  const plan = calculateTreatmentPlan({ ...injury, today });
  const contracture = contractureStatus(injury);
  return (
    <>
      <TodayCard status={plan.status} />
      {contracture === "reported" && <ContractureNotice injuryStartDate={injury.startDate} />}
      {plan.clarifyWithSurgeon && <ClarifyNotice />}
      <Timeline plan={plan} />
      {contracture === "notReported" && <ReportContracture />}
    </>
  );
}
