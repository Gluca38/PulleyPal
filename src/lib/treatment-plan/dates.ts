// Kalenderdaten als Text „JJJJ-MM-TT“ ohne Uhrzeit und Zeitzone. So lassen
// sie sich direkt vergleichen (Textvergleich = zeitliche Reihenfolge) und
// unverändert in der Datenbank (Spaltentyp date) speichern.
export type IsoDate = string;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtc(date: IsoDate) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * MS_PER_DAY);
}

// „Nach N Monaten“ = gleicher Kalendertag N Monate später. Gibt es diesen Tag
// nicht (z. B. 31. Februar), gilt der erste Tag des Folgemonats: lieber einen
// Tag später als zu früh.
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1 + months, 1);
  const daysInTargetMonth = new Date(Date.UTC(year, month + months, 0)).getUTCDate();

  if (day > daysInTargetMonth) {
    return fromUtc(Date.UTC(year, month + months, 1));
  }
  return fromUtc(target + (day - 1) * MS_PER_DAY);
}

// Anzahl Tage von `from` bis `to` (negativ, wenn `to` davor liegt)
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Gültiges Kalenderdatum im Format JJJJ-MM-TT
export function isValidDate(value: string) {
  // Abgleich hin und zurück erkennt Tage wie den 31. Februar
  return ISO_DATE.test(value) && addDays(value, 0) === value;
}

// Spätester erlaubter Starttag (Tag der Verletzung oder der OP). Formulare
// schicken das heutige Datum des Geräts mit, damit „nicht in der Zukunft“ in
// der Zeitzone der Person gilt. Weicht es mehr als einen Tag vom Server ab,
// gilt das Serverdatum (UTC).
export function latestStartDate(deviceToday: string, serverToday: IsoDate): IsoDate {
  if (ISO_DATE.test(deviceToday) && Math.abs(daysBetween(serverToday, deviceToday)) <= 1) {
    return deviceToday;
  }
  return serverToday;
}
