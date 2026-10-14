import { addDays, addMonths, daysBetween, type IsoDate } from "./dates";

export type { IsoDate } from "./dates";

export const GRADES = ["I", "II", "III", "IVa", "IVb"] as const;
export type Grade = (typeof GRADES)[number];

// Schutzart bei Grad I: thermoplastischer Ring oder H-Tape
export const PROTECTION_TYPES = ["ring", "hTape"] as const;
export type ProtectionType = (typeof PROTECTION_TYPES)[number];

export type TreatmentPlanInput = {
  grade: Grade;
  startDate: IsoDate;
  // ärztlich verordnete Dauer innerhalb der Spanne des Grads; ohne Angabe gilt der längere Wert
  prescribedDurationWeeks?: number | null;
  // nur Grad I; ohne Angabe gilt der Ring
  protectionType?: ProtectionType | null;
  today: IsoDate;
};

// Inhalt einer Phase; der Text dazu steht in der Sprachdatei
export type PhaseContent =
  | "week1to2"
  | "week3to4"
  | "week5to6"
  | "week7to8"
  // Grad I: Inhalt „Woche 3–4“ vorgezogen in Woche 1–2, je nach Schutzart
  | "gradeOneWeek1to2Ring"
  | "gradeOneWeek1to2HTape"
  // Grad I: Inhalt „Woche 5–6“ vorgezogen in Woche 3–4; bei 3 Wochen Schutz
  // geteilt in Woche 3 mit Schutz und Woche 4 mit H-Tape bei den Übungen
  | "gradeOneWeek3to4Ring"
  | "gradeOneWeek3to4HTape"
  | "gradeOneWeek3to4HTapeForExercises"
  | "gradeOneWeek3Ring"
  | "gradeOneWeek3HTape"
  | "gradeOneWeek4HTapeForExercises"
  // Aufbautraining vor der leichten sportartspezifischen Aktivität: noch kein Klettern
  | "rebuildBeforeClimbing"
  | "rebuild"
  // Grad I: Aufbautraining nur zwei Wochen bis zur vollen Aktivität nach 6 Wochen
  | "gradeOneRebuild"
  | "taping"
  // Schutzphase „Ab 4 Monaten“ (Grad IV a): Vollbelastung, Wettkampffähigkeit
  | "tapingFullLoad"
  // Grad IV b: Eckpunkte nach der OP statt Wochenplan
  | "gradeFourBImmobilization"
  | "gradeFourBSplint"
  | "gradeFourBRebuild"
  | "gradeFourBLightClimbing";

// Ringbandschutz in einer Ring-Phase. hTapeForExercises: Grad I nach Ende des
// verordneten Schutzes, H-Tape nur noch bei den Übungen
export type SplintProtection = ProtectionType | "hTapeForExercises";

export type Phase = {
  // immobilization: Ruhigstellung nach der OP (Grad IV b)
  kind: "immobilization" | "splint" | "rebuild" | "taping";
  content: PhaseContent;
  // nur bei Ring-Phasen
  protection?: SplintProtection;
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
    | "noClimbingBeforeLightClimbing"
    | "wearHTapeDuringDay"
    | "hTapeForExercises"
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
  // Grad IV b: dauerhafter Hinweis, die Aufbauphase mit Operateur/Handtherapeut zu klären
  clarifyWithSurgeon: boolean;
};

// Zeitangabe „nach N Wochen“ bzw. „nach N Monaten“ ab dem Starttag
type After = { weeks: number } | { months: number };

type PrescribedDuration = { options: number[]; default: number };

// Phasen vor dem Aufbautraining: Ring-Phasen, bei Grad IV b davor die Ruhigstellung
type EarlyPhasePlan =
  | { kind: "splint"; content: PhaseContent; weeks: number; protection: SplintProtection }
  | { kind: "immobilization"; content: PhaseContent; weeks: number };

// Ring-Phasen nach Abschnitt 2: je zwei Wochen mit Ringbandschutzring
function twoWeeksWithRing(contents: PhaseContent[]): EarlyPhasePlan[] {
  return contents.map((content) => ({ kind: "splint", content, weeks: 2, protection: "ring" }));
}

// Abschnitt 3, Grad I: Inhalte „Woche 3–4“ und „Woche 5–6“ vorgezogen in
// Woche 1–4. Der Schutz endet nach der verordneten Dauer, danach H-Tape bei den Übungen.
function gradeOneSplintPhases(
  protectionWeeks: number,
  protection: ProtectionType,
): EarlyPhasePlan[] {
  const ring = protection === "ring";
  const week1to2: EarlyPhasePlan = {
    kind: "splint",
    content: ring ? "gradeOneWeek1to2Ring" : "gradeOneWeek1to2HTape",
    weeks: 2,
    protection,
  };

  switch (protectionWeeks) {
    case 2:
      return [
        week1to2,
        {
          kind: "splint",
          content: "gradeOneWeek3to4HTapeForExercises",
          weeks: 2,
          protection: "hTapeForExercises",
        },
      ];
    case 3:
      return [
        week1to2,
        {
          kind: "splint",
          content: ring ? "gradeOneWeek3Ring" : "gradeOneWeek3HTape",
          weeks: 1,
          protection,
        },
        {
          kind: "splint",
          content: "gradeOneWeek4HTapeForExercises",
          weeks: 1,
          protection: "hTapeForExercises",
        },
      ];
    default:
      return [
        week1to2,
        {
          kind: "splint",
          content: ring ? "gradeOneWeek3to4Ring" : "gradeOneWeek3to4HTape",
          weeks: 2,
          protection,
        },
      ];
  }
}

type GradeRules = {
  // null: Der Grad hat keine Spanne, nach der Dauer wird nicht gefragt
  prescribedDuration: PrescribedDuration | null;
  // Je nach verordneter Dauer und Schutzart: Ring-Phasen und Zeitpunkte laut Tabelle
  plan: (
    prescribedWeeks: number | null,
    protectionType: ProtectionType,
  ) => {
    earlyPhases: EarlyPhasePlan[];
    lightClimbing: After;
    fullClimbing: After;
    tapingEnd: After;
    // ohne Angabe die allgemeinen Inhalte „Aufbautraining“ aus Abschnitt 2
    rebuildBeforeClimbingContent?: "gradeFourBRebuild";
    rebuildContent?: "gradeOneRebuild" | "gradeFourBLightClimbing";
    tapingContent: "taping" | "tapingFullLoad";
    permanentTaping: boolean;
    // Grad IV b: Abschnitt 2 gilt nicht, die Aufbauphase klärt die Person ärztlich
    operative: boolean;
  };
};

// Regeln je Grad laut docs/behandlungsschema.md
const GRADE_RULES: Record<Grade, GradeRules> = {
  I: {
    // Abschnitt 1: 2–4 Wochen H-Tape oder thermoplastischer Ring
    prescribedDuration: { options: [2, 3, 4], default: 4 },
    plan: (prescribedWeeks, protectionType) => ({
      earlyPhases: gradeOneSplintPhases(prescribedWeeks ?? 4, protectionType),
      lightClimbing: { weeks: 4 },
      // Abschnitt 3: „Ab 4 Monaten“ gilt nicht für Grad I
      fullClimbing: { weeks: 6 },
      tapingEnd: { months: 3 },
      rebuildContent: "gradeOneRebuild",
      tapingContent: "taping",
      permanentTaping: false,
      operative: false,
    }),
  },
  II: {
    // Abschnitt 1: volle sportartspezifische Aktivität nach 8–10 Wochen
    prescribedDuration: { options: [8, 10], default: 10 },
    plan: (prescribedWeeks) => ({
      // Abschnitt 1: 6 Wochen Ring; Abschnitt 3: Woche 7–8 nur bei Grad III
      earlyPhases: twoWeeksWithRing(["week1to2", "week3to4", "week5to6"]),
      lightClimbing: { weeks: 6 },
      fullClimbing: { weeks: prescribedWeeks ?? 10 },
      tapingEnd: { months: 3 },
      tapingContent: "taping",
      permanentTaping: false,
      operative: false,
    }),
  },
  III: {
    // Abschnitt 1: 6–8 Wochen thermoplastischer Ring
    prescribedDuration: { options: [6, 8], default: 8 },
    plan: (prescribedWeeks) => ({
      // Abschnitt 3: Woche 7–8 nur, wenn ein Ring für 8 Wochen verordnet ist
      earlyPhases: twoWeeksWithRing(
        prescribedWeeks === 6
          ? ["week1to2", "week3to4", "week5to6"]
          : ["week1to2", "week3to4", "week5to6", "week7to8"],
      ),
      lightClimbing: { weeks: 8 },
      // Abschnitt 3: Für Grad III gilt die Tabelle, nicht „Ab 4 Monaten“
      fullClimbing: { months: 3 },
      tapingEnd: { months: 6 },
      tapingContent: "taping",
      permanentTaping: false,
      operative: false,
    }),
  },
  IVa: {
    prescribedDuration: null,
    plan: () => ({
      // Abschnitt 1: 8 Wochen Ring; Abschnitt 3: Wochenplan inklusive Woche 7–8
      earlyPhases: twoWeeksWithRing(["week1to2", "week3to4", "week5to6", "week7to8"]),
      lightClimbing: { weeks: 10 },
      // Abschnitt 2, „Ab 4 Monaten“: Vollbelastung, Wettkampffähigkeit
      fullClimbing: { months: 4 },
      // Abschnitt 1: H-Tape-Schutz > 12 Monate; Abschnitt 3: danach dauerhaft tapen
      tapingEnd: { months: 12 },
      tapingContent: "tapingFullLoad",
      permanentTaping: true,
      operative: false,
    }),
  },
  IVb: {
    prescribedDuration: null,
    // Abschnitt 3, Grad IV b: nur Eckpunkte ab dem Tag der OP, kein Wochenplan
    plan: () => ({
      // 2 Wochen Ruhigstellung (Woche 1–2), danach 4 Wochen Ring (Woche 3–6)
      earlyPhases: [
        { kind: "immobilization", content: "gradeFourBImmobilization", weeks: 2 },
        { kind: "splint", content: "gradeFourBSplint", weeks: 4, protection: "ring" },
      ],
      lightClimbing: { months: 4 },
      fullClimbing: { months: 6 },
      // H-Tape-Schutz > 12 Monate; Abschnitt 3: danach dauerhaft tapen
      tapingEnd: { months: 12 },
      rebuildBeforeClimbingContent: "gradeFourBRebuild",
      rebuildContent: "gradeFourBLightClimbing",
      tapingContent: "taping",
      permanentTaping: true,
      operative: true,
    }),
  },
};

// Auswahl und Standardwert der verordneten Dauer in Wochen (null: Grad ohne Spanne)
export function prescribedDurationFor(grade: Grade): PrescribedDuration | null {
  return GRADE_RULES[grade].prescribedDuration;
}

// Woche 1 = Starttag bis Starttag + 6 Tage
function weekOf(startDate: IsoDate, date: IsoDate) {
  return Math.floor(daysBetween(startDate, date) / 7) + 1;
}

// Grad IV b: Abschnitt 2 gilt nicht. Bis zur leichten sportartspezifischen
// Aktivität kein Klettern, alles Weitere klärt die Person ärztlich.
function operativeRulesFor(phase: Phase, lightClimbing: IsoDate, tapingEnd: IsoDate): Rule[] {
  if (phase.kind === "taping") {
    return [{ key: "fullClimbingWithTape", type: "allowed", date: addDays(tapingEnd, -1) }];
  }
  if (phase.startDate >= lightClimbing) {
    return [{ key: "carefulClimbingWithTape", type: "allowed" }];
  }
  return [{ key: "noClimbingBeforeLightClimbing", type: "forbidden", date: lightClimbing }];
}

function rulesFor(phase: Phase, lightClimbing: IsoDate, tapingEnd: IsoDate): Rule[] {
  const unspecificTraining: Rule = { key: "unspecificTraining", type: "allowed" };

  switch (phase.kind) {
    case "immobilization":
      // Gibt es nur bei Grad IV b, dort gilt operativeRulesFor
      throw new Error("Ruhigstellung gibt es nur nach einer OP.");
    case "splint":
      if (phase.protection === "ring") {
        // Abschnitt 2: „Allgemein gilt“, „Ringbandschutzring“ und „Belastungsaufbau“
        return [
          { key: "noClimbingWithSplint", type: "forbidden" },
          { key: "removeSplintDaily", type: "reminder" },
          unspecificTraining,
        ];
      }
      // Grad I mit H-Tape (Abschnitt 1: untertags) oder nach dem Schutz (Abschnitt 3):
      // Klettern erst ab der leichten sportartspezifischen Aktivität
      return [
        { key: "noClimbingBeforeLightClimbing", type: "forbidden", date: lightClimbing },
        phase.protection === "hTape"
          ? { key: "wearHTapeDuringDay", type: "reminder" }
          : { key: "hTapeForExercises", type: "reminder" },
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

  const plan = rules.plan(
    input.prescribedDurationWeeks ?? rules.prescribedDuration?.default ?? null,
    input.protectionType ?? "ring",
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

  // Ruhigstellung und Ring-Phasen lückenlos hintereinander ab dem Starttag
  const earlyPhases: Phase[] = [];
  let splintEnd = startDate;
  for (const early of plan.earlyPhases) {
    const nextStart = addDays(splintEnd, early.weeks * 7);
    earlyPhases.push({
      kind: early.kind,
      content: early.content,
      ...(early.kind === "splint" && { protection: early.protection }),
      startDate: splintEnd,
      endDate: addDays(nextStart, -1),
    });
    splintEnd = nextStart;
  }

  // Abschnitt 3: Liegt die leichte sportartspezifische Aktivität nach dem Ende
  // der Ringzeit, gibt es bis dahin Aufbautraining noch ohne Klettern
  const hasGap = lightClimbing > splintEnd;
  const climbingStart = hasGap ? lightClimbing : splintEnd;
  const rebuildBeforeClimbing: Phase[] =
    hasGap
      ? [
          {
            kind: "rebuild",
            content: plan.rebuildBeforeClimbingContent ?? "rebuildBeforeClimbing",
            startDate: splintEnd,
            endDate: addDays(climbingStart, -1),
          },
        ]
      : [];

  // Abschnitt 3, Ablauf nach der Ringzeit
  const phases: Phase[] = [
    ...earlyPhases,
    ...rebuildBeforeClimbing,
    {
      kind: "rebuild",
      content: plan.rebuildContent ?? "rebuild",
      startDate: climbingStart,
      endDate: addDays(fullClimbing, -1),
    },
    {
      kind: "taping",
      content: plan.tapingContent,
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
      clarifyWithSurgeon: plan.operative,
    };
  }

  const nextMilestone = milestones.find((milestone) => milestone.date > today);
  const rulesForPhase = plan.operative ? operativeRulesFor : rulesFor;

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
      rules: rulesForPhase(phase, lightClimbing, tapingEnd),
    },
    clarifyWithSurgeon: plan.operative,
  };
}
