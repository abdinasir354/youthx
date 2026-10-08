import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Service-role client: BYPASSES RLS. Only use for things RLS cannot express
 * (e.g. inviting users, reading auth emails). Never import from client code.
 */
/** Server-only secret. Accepts the legacy and the newer Supabase variable name. */
export function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

export function createAdminClient() {
  const key = serviceRoleKey();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is not set");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
