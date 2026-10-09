"use server";

import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fail, parse, type ActionResult } from "@/lib/action";
import { ADMIN_SESSION_COOKIE } from "@/lib/permissions";
import { canAttempt, clearFailures, recordFailure } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loginSchema } from "@/lib/validations";

/*
 * The public website has no visitor accounts. The only sign-in is the hidden admin page.
 */

/**
 * Back-office sign-in (hidden page). Only accounts with an active admin role get through;
 * everyone else is signed straight back out with the same generic error, so the page reveals
 * nothing about which accounts exist or are admins.
 */
export async function adminLogin(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(loginSchema, input);
  if (!parsed.ok) return parsed.result;
  // 10 wrong passwords per account per 15 minutes; correct sign-ins never count.
  if (!(await canAttempt("admin-login", parsed.data.email, 10, 900))) return fail("common.tooManyRequests");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    await recordFailure("admin-login", parsed.data.email, 900);
    return fail("auth.invalidCredentials");
  }
  await clearFailures("admin-login", parsed.data.email);

  const { data: admin, error: adminError } = await supabase.from("admin_users").select("is_active").eq("user_id", data.user.id).maybeSingle();
  if (adminError) {
    // The database migrations haven't been applied yet (table missing) — say so instead of "wrong password".
    console.error("[admin-login]", adminError.message);
    await supabase.auth.signOut();
    return fail("auth.adminSetupIncomplete");
  }
  if (!admin?.is_active) {
    await supabase.auth.signOut();
    await recordFailure("admin-login", parsed.data.email, 900);
    return fail("auth.invalidCredentials");
  }
  await supabase.rpc("log_admin_event", { p_action: "login", p_details: {} });
  (await cookies()).set(ADMIN_SESSION_COOKIE, data.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  return { ok: true };
}

export async function logout() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    // Recorded only for back-office users (the function ignores everyone else).
    await supabase.rpc("log_admin_event", { p_action: "logout", p_details: {} });
    await supabase.auth.signOut();
  }
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  redirect({ href: "/", locale: await getLocale() });
}
