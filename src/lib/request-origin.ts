// Ermittelt die Domain, unter der die App gerade aufgerufen wird
// (z. B. Vercel-Vorschau, Stage oder Prod). Dorthin führt später der Login-Link.
export function getRequestOrigin(headers: Headers): string | null {
  const origin = headers.get("origin");
  if (origin && origin !== "null") {
    return origin;
  }

  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) {
    return null;
  }

  const protocol = headers.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
