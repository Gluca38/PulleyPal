import { describe, expect, it } from "vitest";
import { validateInjuryForm } from "./validate-injury-form";

const TODAY = "2026-10-14";

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
}

function validate(fields: Record<string, string>, requireConfirmation = true) {
  return validateInjuryForm(form({ today: TODAY, ...fields }), {
    requireConfirmation,
    serverToday: TODAY,
  });
}

describe("validateInjuryForm", () => {
  it("liefert die Verletzung bei gültigen Angaben", () => {
    const result = validate({
      grade: "III",
      startDate: "2026-09-01",
      prescribedDuration: "6",
      confirmed: "on",
    });
    expect(result.errors).toEqual([]);
    expect(result.injury).toEqual({
      grade: "III",
      startDate: "2026-09-01",
      prescribedDurationWeeks: 6,
      protectionType: null,
    });
  });

  it("meldet fehlende Angaben beim Erfassen", () => {
    const result = validate({});
    expect(result.errors).toEqual(["gradeMissing", "startDateMissing", "confirmationMissing"]);
    expect(result.injury).toBeNull();
  });

  it("verlangt die Bestätigung beim Ändern nicht", () => {
    const result = validate({ grade: "II", startDate: "2026-09-01" }, false);
    expect(result.errors).toEqual([]);
    expect(result.injury?.grade).toBe("II");
  });

  it("lehnt einen Starttag in der Zukunft ab", () => {
    const result = validate({ grade: "II", startDate: "2026-10-15" }, false);
    expect(result.errors).toEqual(["startDateInFuture"]);
  });

  it("lehnt einen ungültigen Tag ab", () => {
    const result = validate({ grade: "II", startDate: "2026-02-31" }, false);
    expect(result.errors).toEqual(["startDateMissing"]);
  });

  it("lehnt eine Dauer ab, die es beim Grad nicht gibt", () => {
    const result = validate({ grade: "II", startDate: "2026-09-01", prescribedDuration: "6" }, false);
    expect(result.errors).toEqual(["durationInvalid"]);
  });

  it("setzt bei Grad I ohne Angabe den Ring", () => {
    const result = validate({ grade: "I", startDate: "2026-09-01" }, false);
    expect(result.injury?.protectionType).toBe("ring");
  });

  it("übernimmt bei Grad I das H-Tape", () => {
    const result = validate({ grade: "I", startDate: "2026-09-01", protectionType: "hTape" }, false);
    expect(result.injury?.protectionType).toBe("hTape");
  });

  it("ignoriert die Schutzart bei anderen Graden", () => {
    const result = validate({ grade: "II", startDate: "2026-09-01", protectionType: "hTape" }, false);
    expect(result.injury?.protectionType).toBeNull();
  });

  it("gibt die eingegebenen Werte zurück, damit das Formular sie wieder zeigt", () => {
    const result = validate({ grade: "X", startDate: "2026-09-01", confirmed: "on" });
    expect(result.errors).toEqual(["gradeInvalid"]);
    expect(result.values).toEqual({
      grade: "X",
      startDate: "2026-09-01",
      prescribedDuration: "",
      protectionType: "",
      confirmed: true,
    });
  });
});
