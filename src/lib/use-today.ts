"use client";

import { useSyncExternalStore } from "react";
import type { IsoDate } from "@/lib/treatment-plan/treatment-plan";

// „Heute“ ist das Kalenderdatum der Person in der Zeitzone ihres Geräts,
// nicht das des Servers. Deshalb gibt es das Datum nur im Browser.
function localToday(): IsoDate {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function subscribe() {
  return () => {};
}

// Liefert das heutige Datum des Geräts; null beim Rendern auf dem Server
export function useToday(): IsoDate | null {
  return useSyncExternalStore(subscribe, localToday, () => null);
}
