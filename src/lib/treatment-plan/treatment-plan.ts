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
export type PhaseContent =
  | "week1to2"
  | "week3to4"
  | "week5to6"
  | "week7to8"
  // Aufbautraining vor der leichten sportartspezifischen Aktivität: noch kein Klettern
  | "rebuildBeforeClimbing"
  | "rebuild"
  | "taping"
  // Schutzphase „Ab 4 Monaten“ (Grad IV a): Vollbelastung, Wettkampffähigkeit
  | "tapingFullLoad";

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
  // permanentTaping: Empfehlung, beim Klettern dauerhaft zu tapen (Abschnitt 3)
  | { kind: "completed"; permanentTaping: boolean };

export type TreatmentPlan = {
  phases: Phase[];
  milestones: Milestone[];
  status: TodayStatus;
};

// Zeitangabe „nach N Wochen“ bzw. „nach N Monaten“ ab dem Starttag
type After = { weeks: number } | { months: number };

type PrescribedDuration = { options: number[]; default: number };

type GradeRules = {
  // null: Der Grad hat keine Spanne, nach der Dauer wird nicht gefragt
  prescribedDuration: PrescribedDuration | null;
  // Je nach verordneter Dauer: Inhalte der Ring-Phasen und Zeitpunkte laut Tabelle
  plan: (prescribedWeeks: number | null) => {
    splintPhases: PhaseContent[];
    lightClimbing: After;
    fullClimbing: After;
    tapingEnd: After;
    tapingPhase: "taping" | "tapingFullLoad";
    permanentTaping: boolean;
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
      fullClimbing: { weeks: prescribedWeeks ?? 10 },
      tapingEnd: { months: 3 },
      tapingPhase: "taping",
      permanentTaping: false,
    }),
  },
  III: {
    // Abschnitt 1: 6–8 Wochen thermoplastischer Ring
    prescribedDuration: { options: [6, 8], default: 8 },
    plan: (prescribedWeeks) => ({
      // Abschnitt 3: Woche 7–8 nur, wenn ein Ring für 8 Wochen verordnet ist
      splintPhases:
        prescribedWeeks === 6
          ? ["week1to2", "week3to4", "week5to6"]
          : ["week1to2", "week3to4", "week5to6", "week7to8"],
      lightClimbing: { weeks: 8 },
      // Abschnitt 3: Für Grad III gilt die Tabelle, nicht „Ab 4 Monaten“
      fullClimbing: { months: 3 },
      tapingEnd: { months: 6 },
      tapingPhase: "taping",
      permanentTaping: false,
    }),
  },
  IVa: {
    prescribedDuration: null,
    plan: () => ({
      // Abschnitt 1: 8 Wochen Ring; Abschnitt 3: Wochenplan inklusive Woche 7–8
      splintPhases: ["week1to2", "week3to4", "week5to6", "week7to8"],
      lightClimbing: { weeks: 10 },
      // Abschnitt 2, „Ab 4 Monaten“: Vollbelastung, Wettkampffähigkeit
      fullClimbing: { months: 4 },
      // Abschnitt 1: H-Tape-Schutz > 12 Monate; Abschnitt 3: danach dauerhaft tapen
      tapingEnd: { months: 12 },
      tapingPhase: "tapingFullLoad",
      permanentTaping: true,
    }),
  },
};

// Grade, für die die App schon einen Behandlungsplan berechnen kann
export const SUPPORTED_GRADES = Object.keys(GRADE_RULES) as Grade[];

// Auswahl und Standardwert der verordneten Dauer in Wochen
// (null: Grad ohne Spanne oder noch nicht unterstützt)
export function prescribedDurationFor(grade: Grade): PrescribedDuration | null {
  return GRADE_RULES[grade]?.prescribedDuration ?? null;
}

// Ring-Phasen dauern je zwei Wochen (Abschnitt 2, Spezifisches Training)
const SPLINT_PHASE_DAYS = 14;

// Woche 1 = Starttag bis Starttag + 6 Tage
function weekOf(startDate: IsoDate, date: IsoDate) {
  return Math.floor(daysBetween(startDate, date) / 7) + 1;
}

function rulesFor(phase: Phase, tapingEnd: IsoDate): Rule[] {
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
        phase.content === "rebuildBeforeClimbing"
          ? { key: "noClimbingYet", type: "forbidden" }
          : { key: "carefulClimbingWithTape", type: "allowed" },
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

  const plan = rules.plan(
    input.prescribedDurationWeeks ?? rules.prescribedDuration?.default ?? null,
  );
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

  // Abschnitt 3: Liegt die leichte sportartspezifische Aktivität nach dem Ende
  // der Ringzeit, gibt es bis dahin Aufbautraining noch ohne Klettern
  const climbingStart = lightClimbing > splintEnd ? lightClimbing : splintEnd;
  const rebuildBeforeClimbing: Phase[] =
    climbingStart > splintEnd
      ? [
          {
            kind: "rebuild",
            content: "rebuildBeforeClimbing",
            startDate: splintEnd,
            endDate: addDays(climbingStart, -1),
          },
        ]
      : [];

  // Abschnitt 3, Ablauf nach der Ringzeit
  const phases: Phase[] = [
    ...splintPhases,
    ...rebuildBeforeClimbing,
    {
      kind: "rebuild",
      content: "rebuild",
      startDate: climbingStart,
      endDate: addDays(fullClimbing, -1),
    },
    {
      kind: "taping",
      content: plan.tapingPhase,
      startDate: fullClimbing,
      endDate: addDays(tapingEnd, -1),
    },
  ];

  const phase = phases.find((p) => today >= p.startDate && today <= p.endDate);
  if (!phase) {
    return {
      phases,
      milestones,
      status: { kind: "completed", permanentTaping: plan.permanentTaping },
    };
  }

  const nextMilestone = milestones.find((milestone) => milestone.date > today);

  return {
    phases,
    milestones,
    status: {
      kind: "active",
      phase,
      week: weekOf(startDate, today),
      totalWeeks: weekOf(startDate, addDays(tapingEnd, -1)),
      nextMilestone: nextMilestone
        ? { ...nextMilestone, daysUntil: daysBetween(today, nextMilestone.date) }
        : null,
      rules: rulesFor(phase, tapingEnd),
    },
  };
}
