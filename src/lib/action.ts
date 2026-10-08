import "server-only";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { can, type Perm } from "@/lib/permissions";
import type { AdminRole, Profile, UserRole } from "@/types/database.types";

/** Uniform result for every Server Action. `error` / `fieldErrors` hold message keys translated on the client. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function parse<S extends z.ZodType>(schema: S, input: unknown):
  | { ok: true; data: z.infer<S> }
  | { ok: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, result: fail("validation.invalid", fieldErrors) };
}

/**
 * Who may run an action: a platform role (`roles`) and/or a back-office permission (`perm`).
 * Passing neither means "any signed-in user".
 */
export type Access = { roles?: readonly UserRole[]; perm?: Perm };

/**
 * Session-bound client + the caller's profile and admin role, re-verified inside every action.
 * RLS re-checks everything in the database; this gives a clean "forbidden" early.
 */
export async function actionContext(access: Access = {}) {
  if (!isSupabaseConfigured) return { error: fail("common.notConfigured") } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return { error: fail("errors.forbidden") } as const;
  const [{ data: profile }, { data: admin }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("admin_users").select("role, is_active").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return { error: fail("errors.forbidden") } as const;
  const adminRole = admin?.is_active ? (admin.role as AdminRole) : null;
  const restricted = access.roles != null || access.perm != null;
  const allowed =
    !restricted ||
    (access.roles?.includes((profile as Profile).role) ?? false) ||
    (access.perm != null && can(adminRole, access.perm));
  if (!allowed) return { error: fail("errors.forbidden") } as const;
  return { supabase, userId, profile: profile as Profile, adminRole } as const;
}

/** Postgres exceptions raised by our triggers are user-facing; map the known ones to message keys. */
export function dbError(message: string | undefined): ActionResult<never> {
  const m = message ?? "";
  if (m.includes("set your gender")) return fail("apply.genderRequired");
  if (m.includes("Deadline has passed") || m.includes("not open")) return fail("opportunities.deadlinePassed");
  if (m.includes("duplicate key") && m.includes("applications")) return fail("opportunities.alreadyApplied");
  if (m.includes("Not allowed") || m.includes("row-level security") || m.includes("Only staff") || m.includes("Admins only") ||
      m.includes("Only publishers") || m.includes("own admin access") || m.includes("super admin is required"))
    return fail("errors.forbidden");
  console.error("[db]", m);
  return fail("common.error");
}
