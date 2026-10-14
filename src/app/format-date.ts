"use client";

import { useLocale } from "next-intl";
import type { IsoDate } from "@/lib/treatment-plan/treatment-plan";

// Formatiert ein Kalenderdatum in der Sprache der Seite, z. B. „12. Februar 2026“.
// UTC, damit das Datum unabhängig von der Zeitzone des Geräts gleich bleibt.
export function useFormatDate() {
  const locale = useLocale();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  return (date: IsoDate) => format.format(new Date(`${date}T00:00:00Z`));
}
