"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fail, parse, type ActionResult } from "@/lib/action";
import { canAttempt, clearFailures, isBot, rateLimit, recordFailure } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailOnlySchema, loginSchema, newPasswordSchema, signupSchema } from "@/lib/validations";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

/** Only allow same-site relative redirects after login ("" = let the client go to its dashboard). */
function safeNext(next: unknown) {
  return typeof next === "string" && /^\/(?!\/)[\w\-/]*$/.test(next) ? next : "";
}

export async function login(input: unknown, next?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(loginSchema, input);
  if (!parsed.ok) return parsed.result;
  if (!(await canAttempt("login", parsed.data.email, 10, 900))) return fail("common.tooManyRequests");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    await recordFailure("login", parsed.data.email, 900);
    return fail("auth.invalidCredentials");
  }
  await clearFailures("login", parsed.data.email);
  return { ok: true, data: undefined, message: safeNext(next) };
}

/**
 * Back-office sign-in (hidden page). Same credentials check as `login`, but only accounts
 * with an active admin role get through; everyone else is signed straight back out with the
 * same generic error, so the page reveals nothing about which accounts exist or are admins.
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
  return { ok: true };
}

export async function signup(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(signupSchema, input);
  if (!parsed.ok) return parsed.result;
  if (isBot(parsed.data)) return { ok: true };
  if (!(await rateLimit("signup", 5, 3600))) return fail("common.tooManyRequests");

  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, preferred_language: locale },
      emailRedirectTo: `${await origin()}/auth/callback?next=/${locale}/dashboard/profile`,
    },
  });
  if (error) {
    console.error("[signup]", error.message);
    return fail(error.status === 429 ? "common.tooManyRequests" : "common.error");
  }
  // When email confirmation is disabled the user is signed in immediately.
  return { ok: true, message: data.session ? "signedIn" : "checkEmail" };
}

export async function sendMagicLink(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(emailOnlySchema, input);
  if (!parsed.ok) return parsed.result;
  if (isBot(parsed.data)) return { ok: true };
  if (!(await rateLimit("magic", 5, 3600))) return fail("common.tooManyRequests");

  const locale = await getLocale();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/auth/callback?next=/${locale}/dashboard` },
  });
  // Don't reveal whether the email exists.
  if (error && error.status === 429) return fail("common.tooManyRequests");
  return { ok: true };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(emailOnlySchema, input);
  if (!parsed.ok) return parsed.result;
  if (isBot(parsed.data)) return { ok: true };
  if (!(await rateLimit("reset", 5, 3600))) return fail("common.tooManyRequests");

  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/${locale}/reset-password`,
  });
  return { ok: true };
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(newPasswordSchema, input);
  if (!parsed.ok) return parsed.result;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("common.error");
  return { ok: true };
}

export async function logout() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    // Recorded only for back-office users (the function ignores everyone else).
    await supabase.rpc("log_admin_event", { p_action: "logout", p_details: {} });
    await supabase.auth.signOut();
  }
  redirect({ href: "/", locale: await getLocale() });
}
