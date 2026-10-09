import { cacheLife } from "next/cache";

/** The year is time-dependent, so it is cached (refreshed daily) instead of read per request. */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
