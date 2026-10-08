import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";

/** The year is time-dependent, so it is cached (refreshed daily) instead of read per request. */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  const t = await getTranslations("footer");
  return <>{t("rights", { year: new Date().getFullYear() })}</>;
}
