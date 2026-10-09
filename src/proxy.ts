import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { ADMIN_LOGIN_PATH, ADMIN_SESSION_COOKIE } from "./lib/permissions";
import { updateSession } from "./lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

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

  const { userId, adminRole } = await updateSession(request, response);
  const { locale, path } = stripLocale(request.nextUrl.pathname);

  const redirectTo = (target: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, target);
    url.search = search;
    return withCookies(NextResponse.redirect(url), response);
  };

  // Back office: anyone without an admin role sees a normal 404, so neither the admin
  // area nor the hidden sign-in page is revealed. Layouts + RLS check again.
  if (within(path, "/admin") || within(path, "/preview")) {
    // Needs an admin role AND a sign-in that started from the private admin link.
    const portal = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!userId || !adminRole || portal !== userId) {
      return withCookies(NextResponse.rewrite(new URL(`/${locale}/not-found`, request.url)), response);
    }
    return response;
  }
  if (within(path, ADMIN_LOGIN_PATH) && adminRole && request.cookies.get(ADMIN_SESSION_COOKIE)?.value === userId) return redirectTo("/admin");

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
