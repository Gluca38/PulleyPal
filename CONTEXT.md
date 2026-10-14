# PulleyPal

Begleitet Kletternde mit Ringbandverletzung durch ihre Genesung: Aus Grad und Starttag ergibt sich ein persönlicher Ablauf, der zeigt, wo die Person gerade steht.

Fachbegriffe sind deutsch; im Code wird der in Klammern genannte englische Begriff verwendet.

## Language

### Fachliche Grundlage

**Behandlungsschema** (`treatmentScheme`):
Das fachliche Dokument (`docs/behandlungsschema.md`) mit den allgemeinen Regeln je Grad. Es gilt vor dem Code.
_Avoid_: Therapieplan, Leitlinie

**Grad** (`grade`):
Die ärztlich festgestellte Schwere der Ringbandverletzung: I, II, III, IV a oder IV b. Die Person wählt ihn selbst, die App stellt keine Diagnose.
_Avoid_: Verletzungsart, Schweregrad, Typ

### Persönlicher Ablauf

**Verletzung** (`injury`):
Eine erfasste Ringbandverletzung einer Person mit Grad und Starttag. In der ersten Version hat jede Person genau eine.

**Behandlungsplan** (`treatmentPlan`):
Der persönliche Ablauf einer Person, berechnet aus Grad, Starttag und ggf. verordneter Dauer.
_Avoid_: Programm, Regenerationsprozess

**Starttag** (`startDate`):
Der Tag, ab dem der Behandlungsplan zählt: bei Grad I bis IV a der Tag der Verletzung, bei Grad IV b der Tag der OP.
_Avoid_: Diagnosedatum, Therapiebeginn

**Phase** (`phase`):
Ein Zeitabschnitt im Behandlungsplan mit eigenen Aufgaben und Regeln, z. B. „Woche 3–4“ oder „Aufbautraining“.
_Avoid_: Periode, Stufe, Abschnitt

**Ring-Phase** (`splintPhase`):
Eine Phase, in der der Ringbandschutz (Ring oder bei Grad I ggf. H-Tape) getragen wird und der Wochenplan gilt. Klettern ist verboten.

**Aufbautraining** (`rebuildPhase`):
Die Phase vom Ende der Ringzeit bis zur vollen sportartspezifischen Aktivität. Klettern erst ab dem Meilenstein „leichte sportartspezifische Aktivität“. Liegt dieser nach dem Ende der Ringzeit (z. B. Grad IV a, Woche 9–10), ist das Aufbautraining in zwei Phasen geteilt: erst **noch kein Klettern** (`rebuildBeforeClimbing`), dann mit vorsichtigem Klettern.

**Schutzphase** (`tapingPhase`):
Die Phase von der vollen sportartspezifischen Aktivität bis zum Ende des H-Tape-Schutzes. Bei Grad IV a mit dem Inhalt „Ab 4 Monaten“ aus dem Behandlungsschema (`tapingFullLoad`).
_Avoid_: Tape-Phase

**Dauer-Tape-Empfehlung** (`permanentTaping`):
Bei Grad IV a und IV b der Hinweis im Zustand „Abgeschlossen“, beim Klettern dauerhaft mit H-Tape zu tapen.

**Abgeschlossen** (`completed`):
Der Zustand nach dem Ende der Schutzphase; der Behandlungsplan hat keine weiteren Phasen.

**Meilenstein** (`milestone`):
Ein Zeitpunkt im Behandlungsplan, ab dem etwas Neues erlaubt ist oder etwas endet, z. B. „leichte sportartspezifische Aktivität“.
_Avoid_: Ziel, Termin

**Leichte sportartspezifische Aktivität** (`lightClimbing`):
Meilenstein, ab dem vorsichtiges Klettern mit H-Tape erlaubt ist.
_Avoid_: Kletterstart, leichte Belastung

**Volle sportartspezifische Aktivität** (`fullClimbing`):
Meilenstein, ab dem uneingeschränkt geklettert werden darf (weiterhin mit H-Tape bis Ende der Schutzphase).
_Avoid_: Vollbelastung

**Verordnete Dauer** (`prescribedDuration`):
Die vom Arzt oder der Ärztin festgelegte Dauer innerhalb einer Spanne des Behandlungsschemas (z. B. 6 oder 8 Wochen Ring bei Grad III). Ohne Angabe gilt der längere Wert.

**Schutzart** (`protectionType`):
Bei Grad I die verordnete Art des Ringbandschutzes: H-Tape oder thermoplastischer Ring.

**Kontraktur** (`contracture`):
Der Finger lässt sich im Mittelgelenk (PIP) um mehr als 20° nicht strecken. Bei Grad IV a von der Person optional gemeldet; führt zum Hinweis auf eine mögliche OP.
