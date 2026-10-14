import { describe, expect, it } from "vitest";
import {
  calculateTreatmentPlan,
  prescribedDurationFor,
  type TreatmentPlanInput,
} from "./treatment-plan";

// Die Testnamen verweisen auf die Abschnitte in docs/behandlungsschema.md.

function gradeTwo(today: string, overrides: Partial<TreatmentPlanInput> = {}) {
  return calculateTreatmentPlan({ grade: "II", startDate: "2026-01-01", today, ...overrides });
}

describe("Verordnete Dauer", () => {
  it("Abschnitt 1, Grad II: 8 oder 10 Wochen bis zur vollen Aktivität, ohne Angabe 10", () => {
    expect(prescribedDurationFor("II")).toEqual({ options: [8, 10], default: 10 });
  });
});

describe("Grad II", () => {
  it("Abschnitt 2, Woche 1–2: am Starttag beginnt Woche 1 in der ersten Ring-Phase", () => {
    const { status } = gradeTwo("2026-01-01");

    expect(status.kind).toBe("active");
    if (status.kind !== "active") return;
    expect(status.week).toBe(1);
    expect(status.phase).toMatchObject({ kind: "splint", content: "week1to2" });
  });

  // Kann passieren, wenn die Uhr des Geräts falsch geht oder die Zeitzone wechselt
  it("Grundregeln: liegt heute vor dem Starttag, gilt Woche 1 (nie Abgeschlossen)", () => {
    const { status } = gradeTwo("2025-12-31");

    if (status.kind !== "active") throw new Error("Plan sollte laufen");
    expect(status.week).toBe(1);
    expect(status.phase.content).toBe("week1to2");
  });

  // Starttag 1. Januar: Woche 1 = 1.–7.1., Woche 3 beginnt am 15.1., Woche 5 am 29.1.
  it.each([
    { today: "2026-01-14", week: 2, content: "week1to2", grenze: "letzter Tag Woche 1–2" },
    { today: "2026-01-15", week: 3, content: "week3to4", grenze: "erster Tag Woche 3–4" },
    { today: "2026-01-28", week: 4, content: "week3to4", grenze: "letzter Tag Woche 3–4" },
    { today: "2026-01-29", week: 5, content: "week5to6", grenze: "erster Tag Woche 5–6" },
    { today: "2026-02-11", week: 6, content: "week5to6", grenze: "letzter Tag Woche 5–6" },
  ])("Abschnitt 2, Spezifisches Training mit Ringbandschutzring: $grenze", ({ today, week, content }) => {
    const { status } = gradeTwo(today);

    if (status.kind !== "active") throw new Error("Plan sollte laufen");
    expect(status.week).toBe(week);
    expect(status.phase).toMatchObject({ kind: "splint", content });
  });

  it("Abschnitt 3, Ablauf nach der Ringzeit: nach 6 Wochen Ring beginnt in Woche 7 das Aufbautraining", () => {
    const { status } = gradeTwo("2026-02-12");

    if (status.kind !== "active") throw new Error("Plan sollte laufen");
    expect(status.week).toBe(7);
    expect(status.phase).toMatchObject({ kind: "rebuild", startDate: "2026-02-12" });
  });

  // Volle sportartspezifische Aktivität „nach 8–10 Wochen“ = ab Starttag + 56 bzw. 70 Tage
  it.each([
    { dauer: 8, letzterTagAufbau: "2026-02-25", ersterTagSchutz: "2026-02-26" },
    { dauer: 10, letzterTagAufbau: "2026-03-11", ersterTagSchutz: "2026-03-12" },
    { dauer: null, letzterTagAufbau: "2026-03-11", ersterTagSchutz: "2026-03-12" },
  ])(
    "Abschnitt 1 und 3: mit verordneter Dauer $dauer Wochen beginnt die Schutzphase am $ersterTagSchutz",
    ({ dauer, letzterTagAufbau, ersterTagSchutz }) => {
      const lastRebuildDay = gradeTwo(letzterTagAufbau, { prescribedDurationWeeks: dauer }).status;
      const firstTapingDay = gradeTwo(ersterTagSchutz, { prescribedDurationWeeks: dauer }).status;

      if (lastRebuildDay.kind !== "active" || firstTapingDay.kind !== "active") {
        throw new Error("Plan sollte laufen");
      }
      expect(lastRebuildDay.phase.kind).toBe("rebuild");
      expect(firstTapingDay.phase).toMatchObject({ kind: "taping", startDate: ersterTagSchutz });
      expect(firstTapingDay.week).toBe((dauer ?? 10) + 1);
    },
  );

  // Y = die Woche, in der der letzte Tag der Schutzphase liegt. 3 Monate sind
  // je nach Starttag 89–92 Tage, also 13 oder 14 Wochen.
  it.each([
    { startDate: "2026-01-01", letzterTag: "2026-03-31", totalWeeks: 13 },
    { startDate: "2026-05-01", letzterTag: "2026-07-31", totalWeeks: 14 },
  ])(
    "Woche X von Y: Starttag $startDate ergibt $totalWeeks Wochen bis Ende der Schutzphase",
    ({ startDate, letzterTag, totalWeeks }) => {
      const { status } = gradeTwo(letzterTag, { startDate });

      if (status.kind !== "active") throw new Error("Plan sollte laufen");
      expect(status.totalWeeks).toBe(totalWeeks);
      expect(status.week).toBe(totalWeeks);
    },
  );

  it("Abschnitt 1: Meilensteine leichte und volle sportartspezifische Aktivität und H-Tape-Ende", () => {
    expect(gradeTwo("2026-01-01").milestones).toEqual([
      { kind: "lightClimbing", date: "2026-02-12" },
      { kind: "fullClimbing", date: "2026-03-12" },
      { kind: "tapingEnd", date: "2026-04-01" },
    ]);
    expect(gradeTwo("2026-01-01", { prescribedDurationWeeks: 8 }).milestones).toContainEqual({
      kind: "fullClimbing",
      date: "2026-02-26",
    });
  });

  // Ein Meilenstein, der heute erreicht ist, gilt als erreicht; dann zählt der nächste
  it.each([
    { today: "2026-01-01", kind: "lightClimbing", date: "2026-02-12", daysUntil: 42 },
    { today: "2026-02-11", kind: "lightClimbing", date: "2026-02-12", daysUntil: 1 },
    { today: "2026-02-12", kind: "fullClimbing", date: "2026-03-12", daysUntil: 28 },
    { today: "2026-03-31", kind: "tapingEnd", date: "2026-04-01", daysUntil: 1 },
  ])("Nächster Meilenstein am $today: $kind in $daysUntil Tagen", ({ today, ...expected }) => {
    const { status } = gradeTwo(today);

    if (status.kind !== "active") throw new Error("Plan sollte laufen");
    expect(status.nextMilestone).toEqual(expected);
  });

  it("Abschnitt 2, Ringbandschutzring und Allgemein gilt: in den Ring-Phasen kein Klettern, Ring täglich abnehmen", () => {
    const { status } = gradeTwo("2026-01-20");

    if (status.kind !== "active") throw new Error("Plan sollte laufen");
    expect(status.rules).toEqual([
      { key: "noClimbingWithSplint", type: "forbidden" },
      { key: "removeSplintDaily", type: "reminder" },
      { key: "unspecificTraining", type: "allowed" },
    ]);
  });

  it("Abschnitt 2, Aufbautraining: keine Hängeübungen mit Ring, Klettern mit H-Tape ab Woche 7", () => {
    const { status } = gradeTwo("2026-02-12");

    if (status.kind !== "active") throw new Error("Plan sollte laufen");
    expect(status.rules).toEqual([
      { key: "noHangingWithSplint", type: "forbidden" },
      { key: "carefulClimbingWithTape", type: "allowed" },
      { key: "unspecificTraining", type: "allowed" },
    ]);
  });

  it("Abschnitt 1, H-Tape-Schutz: in der Schutzphase volles Klettern mit H-Tape bis zum letzten Tag der Schutzphase", () => {
    const { status } = gradeTwo("2026-03-12");

    if (status.kind !== "active") throw new Error("Plan sollte laufen");
    expect(status.rules).toEqual([
      { key: "fullClimbingWithTape", type: "allowed", date: "2026-03-31" },
    ]);
  });

  it("Abschnitt 1 und 3: nach 3 Monaten H-Tape-Schutz ist der Plan abgeschlossen", () => {
    const lastTapingDay = gradeTwo("2026-03-31").status;

    if (lastTapingDay.kind !== "active") throw new Error("Plan sollte laufen");
    expect(lastTapingDay.phase).toMatchObject({ kind: "taping", endDate: "2026-03-31" });
    expect(gradeTwo("2026-04-01").status.kind).toBe("completed");
  });

  it("Abschnitt 3: ein Starttag weit in der Vergangenheit ergibt Abgeschlossen", () => {
    expect(gradeTwo("2027-06-01").status.kind).toBe("completed");
  });

  // „Nach N Monaten“ = gleicher Kalendertag; den 30. Februar gibt es nicht,
  // daher endet der Schutz erst mit dem 1. März (lieber später als zu früh)
  it("Monatsrechnung: Starttag 30. November endet nach 3 Monaten am 1. März", () => {
    const start = { startDate: "2026-11-30" };

    expect(gradeTwo("2027-02-28", start).status.kind).toBe("active");
    expect(gradeTwo("2027-03-01", start).status.kind).toBe("completed");
  });

  it("Monatsrechnung: über den Jahreswechsel bleibt der Kalendertag gleich", () => {
    const start = { startDate: "2026-12-15" };

    expect(gradeTwo("2027-03-14", start).status.kind).toBe("active");
    expect(gradeTwo("2027-03-15", start).status.kind).toBe("completed");
  });
});
