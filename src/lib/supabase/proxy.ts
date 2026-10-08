import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { AdminRole } from "@/types/database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Refreshes the Supabase session on `response` and returns the signed-in user's id and role.
 * Runs inside proxy.ts before every page request.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured) return { userId: null, role: null, adminRole: null };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the JWT; do not put any logic between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  if (!userId) return { userId: null, role: null, adminRole: null };

  const [{ data: profile }, { data: admin }] = await Promise.all([
    supabase.from("profiles").select("role, is_mentor_approved").eq("id", userId).maybeSingle(),
    supabase.from("admin_users").select("role, is_active").eq("user_id", userId).maybeSingle(),
  ]);

  return {
    userId,
    role: (profile?.role as string | undefined) ?? null,
    adminRole: admin?.is_active ? (admin.role as AdminRole) : null,
    isMentorApproved: Boolean(profile?.is_mentor_approved),
  };
}
