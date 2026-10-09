import type { AdminRole } from "@/types/database.types";

/**
 * Back-office permission matrix. Mirrors public.has_perm() in
 * supabase/migrations/20261008000002_profiles.sql — the database is the real gate (RLS);
 * this copy only decides what the admin UI shows.
 */
export type Perm = "content" | "programs" | "people" | "inbox" | "media" | "media_delete" | "site" | "settings";

const MATRIX: Record<Perm, AdminRole[]> = {
  content: ["super_admin", "content_admin", "editor"],
  programs: ["super_admin", "content_admin", "program_manager", "editor"],
  people: ["super_admin", "program_manager"],
  inbox: ["super_admin", "content_admin", "program_manager"],
  media: ["super_admin", "content_admin", "program_manager", "editor"],
  media_delete: ["super_admin", "content_admin"],
  site: ["super_admin", "content_admin"],
  settings: ["super_admin"],
};

export function can(role: AdminRole | null | undefined, perm: Perm) {
  return !!role && MATRIX[perm].includes(role);
}

/** Editors draft; everyone else may publish. Mirrors public.can_publish(). */
export function canPublish(role: AdminRole | null | undefined) {
  return role === "super_admin" || role === "content_admin" || role === "program_manager";
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  content_admin: "Content Admin",
  program_manager: "Program Manager",
  editor: "Editor",
};

/** Hidden admin sign-in page. Not linked anywhere and excluded from search engines. */
export const ADMIN_LOGIN_PATH = "/xbh-ctrl-cakel/auth";

/**
 * Set (httpOnly) only by a successful sign-in on the hidden admin page. The admin area needs
 * both this marker and an active admin role, so admin access only ever starts from that link.
 * It isn't a security boundary on its own — RLS and the role checks are.
 */
export const ADMIN_SESSION_COOKIE = "yx_admin";
