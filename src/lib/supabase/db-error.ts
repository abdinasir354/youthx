import "server-only";

let warnedMissingSchema = false;

/**
 * Logs a failed read. A missing table (PostgREST PGRST205) means the migrations haven't been
 * applied yet: pages still render their empty states, and we print one clear setup hint
 * instead of an error on every request.
 */
export function logReadError(where: string, error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "PGRST205" || error.message.includes("schema cache")) {
    if (!warnedMissingSchema) {
      warnedMissingSchema = true;
      console.warn(
        "[supabase] Database tables are missing — run supabase/setup-all.sql in the Supabase SQL Editor " +
          "(or `supabase db push`). Pages show empty states until then.",
      );
    }
    return;
  }
  console.error(`[db] ${where}:`, error.message);
}
