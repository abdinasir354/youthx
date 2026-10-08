"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { actionContext, dbError, fail, parse, type ActionResult } from "@/lib/action";
import { ageFromDob, ageGroup, toCsv } from "@/lib/utils";
import { courseSchema, lessonSchema, postSchema } from "@/lib/validations";
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

export async function setOrgVerified(orgId: string, verified: boolean): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "people" });
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("organizations").update({ is_verified: verified }).eq("id", orgId);
  if (error) return dbError(error.message);
  updateTag("organizations");
  updateTag("stats");
  refreshAdmin();
  return { ok: true };
}

// ---------------- opportunities ----------------
const oppStatus = z.enum(["draft", "pending_review", "published", "closed", "archived"]);

export async function setOpportunityStatus(id: string, status: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "programs" });
  if ("error" in ctx) return ctx.error!;
  const s = oppStatus.safeParse(status);
  if (!s.success) return fail("validation.invalid");
  const { error } = await ctx.supabase.from("opportunities").update({ status: s.data }).eq("id", id);
  if (error) return dbError(error.message);
  updateTag("opportunities");
  updateTag("seats");
  updateTag("stats");
  refreshAdmin();
  return { ok: true };
}

const quotaSchema = z.object({
  id: uuid,
  female_ratio: z.coerce.number().min(0).max(1),
  allow_rollover: z.boolean(),
});

export async function updateQuota(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "programs" });
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(quotaSchema, input);
  if (!parsed.ok) return parsed.result;
  const { id, ...rest } = parsed.data;
  // Ratio changes are logged by the opportunities trigger.
  const { error } = await ctx.supabase.from("opportunities").update({ ...rest, female_ratio: Math.round(rest.female_ratio * 100) / 100 }).eq("id", id);
  if (error) return dbError(error.message);
  updateTag("seats");
  refreshAdmin();
  return { ok: true };
}

export async function applyRollover(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "settings" });
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.rpc("apply_rollover", { opp: id });
  if (error) {
    if (/Deadline not reached|Rollover not enabled/.test(error.message)) return fail("validation.invalid");
    return dbError(error.message);
  }
  updateTag("seats");
  refreshAdmin();
  return { ok: true };
}

// ---------------- applications (bulk) ----------------
const bulkSchema = z.object({
  ids: z.array(uuid).min(1).max(200),
  status: z.enum(["under_review", "shortlisted", "accepted", "rejected", "waitlisted"]),
});

/** Bulk update. "accepted" goes one by one through accept_application(), so the quota still applies. */
export async function bulkUpdateApplications(input: unknown): Promise<ActionResult<{ accepted: number; waitlisted: number; failed: number }>> {
  const ctx = await actionContext({ perm: "people" });
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(bulkSchema, input);
  if (!parsed.ok) return parsed.result;
  const { ids, status } = parsed.data;
  const result = { accepted: 0, waitlisted: 0, failed: 0 };

  if (status === "accepted") {
    for (const id of ids) {
      const { data, error } = await ctx.supabase.rpc("accept_application", { app_id: id });
      if (error) result.failed++;
      else if (data === "accepted") result.accepted++;
      else result.waitlisted++;
    }
  } else {
    const { data, error } = await ctx.supabase.from("applications").update({ status }).in("id", ids).neq("status", "withdrawn").select("id");
    if (error) return dbError(error.message);
    result.failed = ids.length - (data?.length ?? 0);
  }
  updateTag("seats");
  updateTag("stats");
  refreshAdmin();
  return { ok: true, data: result };
}

// ---------------- content: courses / lessons / posts ----------------
export async function saveCourse(input: unknown): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(courseSchema, input);
  if (!parsed.ok) return parsed.result;
  const { id, ...row } = parsed.data;
  const q = id
    ? ctx.supabase.from("courses").update(row).eq("id", id).select("id").single()
    : ctx.supabase.from("courses").insert({ ...row, created_by: ctx.userId }).select("id").single();
  const { data, error } = await q;
  if (error) return error.message.includes("duplicate") ? fail("validation.invalid", { slug: "invalid" }) : dbError(error.message);
  updateTag("courses");
  updateTag("stats");
  refreshAdmin();
  return { ok: true, data: data.id };
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("courses").delete().eq("id", id);
  if (error) return dbError(error.message);
  updateTag("courses");
  refreshAdmin();
  return { ok: true };
}

export async function saveLesson(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(lessonSchema, input);
  if (!parsed.ok) return parsed.result;
  const { id, ...row } = parsed.data;
  const { error } = id ? await ctx.supabase.from("lessons").update(row).eq("id", id) : await ctx.supabase.from("lessons").insert(row);
  if (error) return dbError(error.message);
  updateTag("courses");
  refreshAdmin();
  return { ok: true };
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("lessons").delete().eq("id", id);
  if (error) return dbError(error.message);
  updateTag("courses");
  refreshAdmin();
  return { ok: true };
}

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

// ---------------- CSV exports ----------------
type ExportApp = {
  status: string; gender_snapshot: string; submitted_at: string; decided_at: string | null;
  opportunity: { title: string; type: string } | null;
  applicant: { full_name: string; email: string | null; region: string | null; date_of_birth: string | null; education_level: string | null } | null;
};

export async function exportApplicationsCsv(): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "people" });
  if ("error" in ctx) return ctx.error!;
  const { data, error } = await ctx.supabase
    .from("applications")
    .select("status, gender_snapshot, submitted_at, decided_at, opportunity:opportunities(title, type), applicant:profiles!applications_applicant_id_fkey(full_name, email, region, date_of_birth, education_level)")
    .order("submitted_at", { ascending: false })
    .limit(10000);
  if (error) return dbError(error.message);
  const now = new Date();
  const rows = ((data as unknown as ExportApp[]) ?? []).map((a) => ({
    opportunity: a.opportunity?.title,
    program: a.opportunity?.type,
    applicant: a.applicant?.full_name,
    email: a.applicant?.email,
    gender: a.gender_snapshot,
    age_group: ageGroup(ageFromDob(a.applicant?.date_of_birth, now)),
    region: a.applicant?.region,
    education: a.applicant?.education_level,
    status: a.status,
    submitted_at: a.submitted_at,
    decided_at: a.decided_at,
  }));
  return { ok: true, data: toCsv(rows) };
}

export async function exportUsersCsv(): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "people" });
  if ("error" in ctx) return ctx.error!;
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("full_name, email, role, gender, date_of_birth, region, district, education_level, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) return dbError(error.message);
  const now = new Date();
  const rows = (data ?? []).map(({ date_of_birth, ...p }) => ({ ...p, age_group: ageGroup(ageFromDob(date_of_birth as string | null, now)) }));
  return { ok: true, data: toCsv(rows) };
}
