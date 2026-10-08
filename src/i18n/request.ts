import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

// Don't destructure `requestLocale`: it is a getter that reads headers(), which is
// forbidden inside "use cache" scopes. Only touch it when root params are unavailable.
export default getRequestConfig(async (params) => {
  let candidate = params.locale;
  if (!candidate) {
    try {
      // Server Components: read the [locale] root param (keeps pages statically renderable).
      candidate = await rootLocale();
    } catch {
      // Server Actions / Route Handlers have no root params: use the header set by proxy.ts.
      candidate = await params.requestLocale;
    }
  }
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Africa/Mogadishu",
  };
});
