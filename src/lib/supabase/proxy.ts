import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

// Seiten, die ohne Anmeldung erreichbar sind. Alles andere ist geschützt.
const PUBLIC_PATHS = ["/login", "/auth/"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path));
}

// Läuft vor jedem Seitenaufruf: frischt die Anmeldung auf (neue Cookies) und
// leitet Gäste von geschützten Seiten zum Login um.
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Zwischen createServerClient und getClaims darf kein anderer Code stehen,
  // sonst kann die Anmeldung unbemerkt verloren gehen.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && !isPublicPath(pathname)) {
    return redirectKeepingCookies(request, response, "/login");
  }

  if (isLoggedIn && pathname === "/login") {
    return redirectKeepingCookies(request, response, "/");
  }

  return response;
}

// Bei einer Umleitung müssen die eben aufgefrischten Cookies mitgehen.
function redirectKeepingCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
