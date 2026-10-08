import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { can, type Perm } from "@/lib/permissions";
import type { AdminRole, Profile, UserRole } from "@/types/database.types";

export type CurrentUser = { id: string; email: string | null; profile: Profile; adminRole: AdminRole | null };

/**
 * Reads the session cookie and loads the profile + back-office role. Deduplicated per request.
 * Reads cookies → callers must sit inside a <Suspense> boundary (Cache Components rule).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return null;
  const [{ data: profile }, { data: admin }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("admin_users").select("role, is_active").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return null;
  return {
    id: userId,
    email: (data?.claims?.email as string | undefined) ?? null,
    profile: profile as Profile,
    adminRole: admin?.is_active ? (admin.role as AdminRole) : null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale: await getLocale() });
  return user!;
}

/** Platform areas (partner, mentor). Back-office users with `adminPerm` may enter too. */
export async function requireRole(roles: UserRole[], adminPerm?: Perm): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = roles.includes(user.profile.role) || (adminPerm != null && can(user.adminRole, adminPerm));
  if (!allowed) redirect({ href: "/dashboard", locale: await getLocale() });
  return user;
}

/**
 * Back-office pages. Anyone without an admin role gets a plain 404, so the admin area
 * (and its hidden sign-in URL) isn't revealed. Admins lacking `perm` go back to the dashboard.
 */
export async function requireAdmin(perm?: Perm): Promise<CurrentUser & { adminRole: AdminRole }> {
  const user = await getCurrentUser();
  if (!user?.adminRole) notFound();
  if (perm && !can(user.adminRole, perm)) redirect({ href: "/admin", locale: await getLocale() });
  return user as CurrentUser & { adminRole: AdminRole };
}
