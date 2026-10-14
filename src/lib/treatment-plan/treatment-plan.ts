import { addDays, addMonths, daysBetween, type IsoDate } from "./dates";

export type { IsoDate } from "./dates";

export const GRADES = ["I", "II", "III", "IVa", "IVb"] as const;
export type Grade = (typeof GRADES)[number];

export type TreatmentPlanInput = {
  grade: Grade;
  startDate: IsoDate;
  // ärztlich verordnete Dauer innerhalb der Spanne des Grads; ohne Angabe gilt der längere Wert
  prescribedDurationWeeks?: number | null;
  today: IsoDate;
};

// Inhalt einer Phase; der Text dazu steht in der Sprachdatei
export type PhaseContent = "week1to2" | "week3to4" | "week5to6" | "rebuild" | "taping";

export type Phase = {
  kind: "splint" | "rebuild" | "taping";
  content: PhaseContent;
  startDate: IsoDate;
  // letzter Tag der Phase
  endDate: IsoDate;
};

// Zeitpunkt, ab dem etwas Neues erlaubt ist oder etwas endet
export type Milestone = {
  kind: "lightClimbing" | "fullClimbing" | "tapingEnd";
  date: IsoDate;
};

// Was heute erlaubt, verboten oder zu beachten ist; der Text steht in der Sprachdatei
export type Rule = {
  key:
    | "noClimbingWithSplint"
    | "removeSplintDaily"
    | "unspecificTraining"
    | "noHangingWithSplint"
    | "noClimbingYet"
    | "carefulClimbingWithTape"
    | "fullClimbingWithTape";
  type: "allowed" | "forbidden" | "reminder";
  // z. B. bis wann mit H-Tape geklettert wird
  date?: IsoDate;
};

export type TodayStatus =
  | {
      kind: "active";
      phase: Phase;
      week: number;
      totalWeeks: number;
      nextMilestone: (Milestone & { daysUntil: number }) | null;
      rules: Rule[];
    }
  | { kind: "completed" };

export type TreatmentPlan = {
  phases: Phase[];
  milestones: Milestone[];
  // Tag, ab dem der Plan abgeschlossen ist (nach dem Ende der Schutzphase)
  completedDate: IsoDate;
  status: TodayStatus;
};

// Zeitangabe „nach N Wochen“ bzw. „nach N Monaten“ ab dem Starttag
type After = { weeks: number } | { months: number };

type GradeRules = {
  prescribedDuration: { options: number[]; default: number };
  // Je nach verordneter Dauer: Inhalte der Ring-Phasen und Zeitpunkte laut Tabelle
  plan: (prescribedWeeks: number) => {
    splintPhases: PhaseContent[];
    lightClimbing: After;
    fullClimbing: After;
    tapingEnd: After;
  };
};

// Regeln je Grad laut docs/behandlungsschema.md. Weitere Grade werden hier ergänzt.
const GRADE_RULES: Partial<Record<Grade, GradeRules>> = {
  II: {
    // Abschnitt 1: volle sportartspezifische Aktivität nach 8–10 Wochen
    prescribedDuration: { options: [8, 10], default: 10 },
    plan: (prescribedWeeks) => ({
      // Abschnitt 1: 6 Wochen Ring; Abschnitt 3: Woche 7–8 nur bei Grad III
      splintPhases: ["week1to2", "week3to4", "week5to6"],
      lightClimbing: { weeks: 6 },
      fullClimbing: { weeks: prescribedWeeks },
      tapingEnd: { months: 3 },
    }),
  },
};

// Grade, für die die App schon einen Behandlungsplan berechnen kann
export const SUPPORTED_GRADES = Object.keys(GRADE_RULES) as Grade[];

// Auswahl und Standardwert der verordneten Dauer in Wochen (null: nicht unterstützter Grad)
export function prescribedDurationFor(grade: Grade) {
  return GRADE_RULES[grade]?.prescribedDuration ?? null;
}

// Ring-Phasen dauern je zwei Wochen (Abschnitt 2, Spezifisches Training)
const SPLINT_PHASE_DAYS = 14;

// Woche 1 = Starttag bis Starttag + 6 Tage
function weekOf(startDate: IsoDate, date: IsoDate) {
  return Math.floor(daysBetween(startDate, date) / 7) + 1;
}

function rulesFor(phase: Phase, today: IsoDate, lightClimbing: IsoDate, tapingEnd: IsoDate): Rule[] {
  const unspecificTraining: Rule = { key: "unspecificTraining", type: "allowed" };

  switch (phase.kind) {
    case "splint":
      // Abschnitt 2: „Allgemein gilt“, „Ringbandschutzring“ und „Belastungsaufbau“
      return [
        { key: "noClimbingWithSplint", type: "forbidden" },
        { key: "removeSplintDaily", type: "reminder" },
        unspecificTraining,
      ];
    case "rebuild":
      // Abschnitt 2, Aufbautraining; Abschnitt 3: Klettern erst ab leichter sportartspezifischer Aktivität
      return [
        { key: "noHangingWithSplint", type: "forbidden" },
        today >= lightClimbing
          ? { key: "carefulClimbingWithTape", type: "allowed" }
          : { key: "noClimbingYet", type: "forbidden" },
        unspecificTraining,
      ];
    case "taping":
      // Datum = letzter Tag mit H-Tape-Schutz
      return [{ key: "fullClimbingWithTape", type: "allowed", date: addDays(tapingEnd, -1) }];
  }
}

function dateAfter(startDate: IsoDate, after: After): IsoDate {
  return "weeks" in after ? addDays(startDate, after.weeks * 7) : addMonths(startDate, after.months);
}

// Berechnet den Behandlungsplan laut docs/behandlungsschema.md.
// Reine Funktion: kennt weder Datenbank noch Uhr, „heute“ kommt als Eingabe.
export function calculateTreatmentPlan(input: TreatmentPlanInput): TreatmentPlan {
  const { grade, startDate } = input;
  // Liegt heute vor dem Starttag (falsche Geräteuhr), gilt der Starttag
  const today = input.today < startDate ? startDate : input.today;
  const rules = GRADE_RULES[grade];
  if (!rules) {
    throw new Error(`Grad ${grade} wird noch nicht unterstützt.`);
  }

  const plan = rules.plan(input.prescribedDurationWeeks ?? rules.prescribedDuration.default);
  const fullClimbing = dateAfter(startDate, plan.fullClimbing);
  const tapingEnd = dateAfter(startDate, plan.tapingEnd);
  // Abschnitt 3: Die Meilensteine gelten fest laut Tabelle
  const lightClimbing = dateAfter(startDate, plan.lightClimbing);
  const milestones: Milestone[] = [
    { kind: "lightClimbing", date: lightClimbing },
    { kind: "fullClimbing", date: fullClimbing },
    { kind: "tapingEnd", date: tapingEnd },
  ];

  const splintPhases: Phase[] = plan.splintPhases.map((content, index) => ({
    kind: "splint",
    content,
    startDate: addDays(startDate, index * SPLINT_PHASE_DAYS),
    endDate: addDays(startDate, (index + 1) * SPLINT_PHASE_DAYS - 1),
  }));
  const splintEnd = addDays(startDate, plan.splintPhases.length * SPLINT_PHASE_DAYS);

  // Abschnitt 3, Ablauf nach der Ringzeit
  const phases: Phase[] = [
    ...splintPhases,
    { kind: "rebuild", content: "rebuild", startDate: splintEnd, endDate: addDays(fullClimbing, -1) },
    { kind: "taping", content: "taping", startDate: fullClimbing, endDate: addDays(tapingEnd, -1) },
  ];

  // Abschnitt 3: nach dem Ende der Schutzphase ist der Plan abgeschlossen
  const completedDate = tapingEnd;
  const phase = phases.find((p) => today >= p.startDate && today <= p.endDate);
  if (!phase) {
    return { phases, milestones, completedDate, status: { kind: "completed" } };
  }

  const nextMilestone = milestones.find((milestone) => milestone.date > today);

  return {
    phases,
    milestones,
    completedDate,
    status: {
      kind: "active",
      phase,
      week: weekOf(startDate, today),
      totalWeeks: weekOf(startDate, addDays(tapingEnd, -1)),
      nextMilestone: nextMilestone
        ? { ...nextMilestone, daysUntil: daysBetween(today, nextMilestone.date) }
        : null,
      rules: rulesFor(phase, today, lightClimbing, tapingEnd),
    },
  };
}
