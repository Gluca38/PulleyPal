import { describe, expect, it } from "vitest";
import { validateSurgeryForm } from "./validate-surgery-form";

const injuryStartDate = "2026-03-01";
const serverToday = "2026-06-15";

function formWith(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
}

function validate(fields: Record<string, string>) {
  return validateSurgeryForm(formWith(fields), { injuryStartDate, serverToday });
}

describe("Ich wurde operiert: Tag der OP", () => {
  it("gültiger Tag wird zum neuen Starttag", () => {
    expect(validate({ surgeryDate: "2026-06-01" })).toEqual({
      errors: [],
      surgeryDate: "2026-06-01",
    });
  });

  it("fehlt oder ist kein gültiges Datum", () => {
    expect(validate({}).errors).toEqual(["surgeryDateMissing"]);
    expect(validate({ surgeryDate: "2026-02-31" }).errors).toEqual(["surgeryDateMissing"]);
  });

  it("darf nicht in der Zukunft liegen", () => {
    expect(validate({ surgeryDate: "2026-06-16" })).toEqual({
      errors: ["surgeryDateInFuture"],
      surgeryDate: null,
    });
    expect(validate({ surgeryDate: "2026-06-15" }).errors).toEqual([]);
  });

  it("„heute“ gilt in der Zeitzone des Geräts", () => {
    expect(validate({ surgeryDate: "2026-06-16", today: "2026-06-16" }).errors).toEqual([]);
  });

  it("darf nicht vor dem bisherigen Starttag liegen, am Starttag selbst schon", () => {
    expect(validate({ surgeryDate: "2026-02-28" }).errors).toEqual(["surgeryDateBeforeStartDate"]);
    expect(validate({ surgeryDate: "2026-03-01" }).errors).toEqual([]);
  });
});
