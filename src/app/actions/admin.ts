"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { actionContext, dbError, fail, parse, type ActionResult } from "@/lib/action";
import { postSchema } from "@/lib/validations";
import { ADMIN_ROLES, USER_ROLES, type AdminRole, type UserRole } from "@/types/database.types";

const uuid = z.string().uuid();

function refreshAdmin() {
  revalidatePath("/[locale]/admin", "layout");
}

// ---------------- users ----------------
export async function setUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "settings" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(userId).success || !USER_ROLES.includes(role)) return fail("validation.invalid");
  if (userId === ctx.userId) return fail("errors.forbidden"); // don't lock yourself out
  // The profiles trigger writes the change to the audit log.
  const { error } = await ctx.supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return dbError(error.message);
  updateTag("mentors");
  refreshAdmin();
  return { ok: true };
}

/** Grant, change or remove back-office access. `null` removes it. Super admins only (RLS + trigger enforce it too). */
export async function setAdminRole(userId: string, role: AdminRole | null): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "settings" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(userId).success || (role !== null && !ADMIN_ROLES.includes(role))) return fail("validation.invalid");
  if (userId === ctx.userId) return fail("errors.forbidden");
  const { error } = role
    ? await ctx.supabase.from("admin_users").upsert({ user_id: userId, role, is_active: true })
    : await ctx.supabase.from("admin_users").delete().eq("user_id", userId);
  if (error) return dbError(error.message);
  refreshAdmin();
  return { ok: true };
}

export async function setMentorApproved(userId: string, approved: boolean): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "settings" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(userId).success) return fail("validation.invalid");
  const { error } = await ctx.supabase.from("profiles").update({ is_mentor_approved: approved }).eq("id", userId);
  if (error) return dbError(error.message);
  updateTag("mentors");
  refreshAdmin();
  return { ok: true };
}








// ---------------- content: courses / lessons / posts ----------------


export async function savePost(input: unknown): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(postSchema, input);
  if (!parsed.ok) return parsed.result;
  const { id, ...row } = parsed.data;
  let published_at: string | null | undefined;
  if (row.is_published) {
    const { data: current } = id ? await ctx.supabase.from("posts").select("published_at").eq("id", id).maybeSingle() : { data: null };
    published_at = current?.published_at ?? new Date().toISOString();
  }
  const full = { ...row, ...(published_at !== undefined ? { published_at } : {}) };
  const q = id
    ? ctx.supabase.from("posts").update(full).eq("id", id).select("id").single()
    : ctx.supabase.from("posts").insert({ ...full, author_id: ctx.userId }).select("id").single();
  const { data, error } = await q;
  if (error) return error.message.includes("duplicate") ? fail("validation.invalid", { slug: "invalid" }) : dbError(error.message);
  updateTag("posts");
  refreshAdmin();
  return { ok: true, data: data.id };
}

export async function deletePost(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("posts").delete().eq("id", id);
  if (error) return dbError(error.message);
  updateTag("posts");
  refreshAdmin();
  return { ok: true };
}

// ---------------- inbox: donations, messages, partner requests ----------------
export async function setDonationStatus(id: string, status: "pledged" | "confirmed" | "cancelled"): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "inbox" });
  if ("error" in ctx) return ctx.error!;
  if (!["pledged", "confirmed", "cancelled"].includes(status)) return fail("validation.invalid");
  const { error } = await ctx.supabase.from("donations").update({ status }).eq("id", id);
  if (error) return dbError(error.message);
  refreshAdmin();
  return { ok: true };
}

export async function setMessageRead(id: string, isRead: boolean): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "inbox" });
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("contact_messages").update({ is_read: isRead }).eq("id", id);
  if (error) return dbError(error.message);
  refreshAdmin();
  return { ok: true };
}

export async function setPartnerRequestStatus(id: string, status: "new" | "contacted" | "approved" | "declined"): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "inbox" });
  if ("error" in ctx) return ctx.error!;
  if (!["new", "contacted", "approved", "declined"].includes(status)) return fail("validation.invalid");
  const { error } = await ctx.supabase.from("partner_requests").update({ status }).eq("id", id);
  if (error) return dbError(error.message);
  refreshAdmin();
  return { ok: true };
}



