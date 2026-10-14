import { describe, expect, it } from "vitest";
import { contractureStatus } from "./contracture";

// Die Testnamen verweisen auf die Abschnitte in docs/behandlungsschema.md.

describe("Kontraktur", () => {
  it("Abschnitt 3, Grad IV a: ohne Meldung lässt sich eine Kontraktur melden", () => {
    expect(contractureStatus({ grade: "IVa", contractureReported: false })).toBe("notReported");
  });

  it("Abschnitt 3, Grad IV a: nach der Meldung gibt es den Hinweis auf eine mögliche OP", () => {
    expect(contractureStatus({ grade: "IVa", contractureReported: true })).toBe("reported");
  });

  it.each(["I", "II", "III", "IVb"] as const)(
    "Abschnitt 3: bei Grad %s gibt es weder Meldung noch Hinweis",
    (grade) => {
      expect(contractureStatus({ grade, contractureReported: false })).toBe("notApplicable");
      expect(contractureStatus({ grade, contractureReported: true })).toBe("notApplicable");
    },
  );
});
