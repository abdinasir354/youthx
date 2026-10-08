import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { ADMIN_LOGIN_PATH, can } from "./lib/permissions";
import { updateSession } from "./lib/supabase/proxy";
import type { AdminRole } from "./types/database.types";

const handleI18n = createIntlMiddleware(routing);

type Session = { userId: string | null; role: string | null; adminRole: AdminRole | null };

/** Which platform areas each role may enter. Layouts and RLS re-check this on the server. */
const PROTECTED: { prefix: string; allow: (s: Session) => boolean }[] = [
  { prefix: "/partner", allow: (s) => s.role === "partner" || can(s.adminRole, "people") },
  { prefix: "/mentor", allow: (s) => s.role === "mentor" },
  { prefix: "/dashboard", allow: () => true },
];
const AUTH_PAGES = ["/login", "/signup"];

function stripLocale(pathname: string) {
  const [, first, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(first)) return { locale: first, path: "/" + rest.join("/") };
  return { locale: routing.defaultLocale, path: pathname };
}

function localized(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path === "/" ? "" : path}`;
}

const within = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  // next-intl may redirect (e.g. /en/about -> /about); nothing else to do then.
  if (response.headers.get("location")) return response;

  const session = await updateSession(request, response);
  const { userId, adminRole } = session;
  const { locale, path } = stripLocale(request.nextUrl.pathname);

  const redirectTo = (target: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, target);
    url.search = search;
    return withCookies(NextResponse.redirect(url), response);
  };

  // Back office: anyone without an admin role sees a normal 404, so neither the admin
  // area nor the hidden sign-in page is revealed. Layouts + RLS check again.
  if (within(path, "/admin")) {
    if (!userId || !adminRole) {
      return withCookies(NextResponse.rewrite(new URL(`/${locale}/not-found`, request.url)), response);
    }
    return response;
  }
  if (within(path, ADMIN_LOGIN_PATH) && adminRole) return redirectTo("/admin");

  const area = PROTECTED.find((p) => within(path, p.prefix));
  if (area) {
    if (!userId) return redirectTo("/login", `?next=${encodeURIComponent(request.nextUrl.pathname)}`);
    if (!area.allow(session)) return redirectTo(adminRole ? "/admin" : "/dashboard");
  }

  if (userId && AUTH_PAGES.includes(path)) return redirectTo("/dashboard");

  return response;
}

/** Carry refreshed auth cookies over to a redirect / rewrite response. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((c) => target.cookies.set(c));
  return target;
}

export const config = {
  // Skip API routes, Next internals, auth callback and static files.
  matcher: ["/((?!api|auth/callback|_next|_vercel|.*\\..*).*)"],
};
