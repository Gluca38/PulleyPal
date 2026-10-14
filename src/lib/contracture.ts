import type { Grade } from "@/lib/treatment-plan/treatment-plan";

// Kontraktur (docs/behandlungsschema.md, Abschnitt 3, Grad IV a): nur bei
// Grad IV a meldbar. notReported: Option „Kontraktur melden“; reported: Hinweis
// auf eine mögliche OP und Wechsel zu Grad IV b nach der OP.
export type ContractureStatus = "notApplicable" | "notReported" | "reported";

export function contractureStatus({
  grade,
  contractureReported,
}: {
  grade: Grade;
  contractureReported: boolean;
}): ContractureStatus {
  if (grade !== "IVa") {
    return "notApplicable";
  }
  return contractureReported ? "reported" : "notReported";
}
