"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { actionContext, dbError, fail, parse, type Access, type ActionResult } from "@/lib/action";
import { slugify } from "@/lib/utils";
import { opportunitySchema, organizationSchema } from "@/lib/validations";
import type { ApplicationStatus } from "@/types/database.types";

/** Partners, plus back-office users who manage people. */
const REVIEWERS = { roles: ["partner"], perm: "people" } as const satisfies Access;

// ---------------- organization ----------------
export async function saveOrganization(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext(REVIEWERS);
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(organizationSchema, input);
  if (!parsed.ok) return parsed.result;
  if (parsed.data.logo_url && !parsed.data.logo_url.includes(`/org-logos/${ctx.userId}/`)) return fail("validation.invalid");

  const { data: membership } = await ctx.supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", ctx.userId)
    .limit(1)
    .maybeSingle();

  const row = { ...parsed.data, logo_url: parsed.data.logo_url ?? undefined };
  const { error } = membership
    ? await ctx.supabase.from("organizations").update(row).eq("id", membership.organization_id)
    : await ctx.supabase.from("organizations").insert({
        ...row,
        slug: `${slugify(parsed.data.name)}-${crypto.randomUUID().slice(0, 6)}`,
        created_by: ctx.userId, // the trigger makes the creator the owner
      });
  if (error) return dbError(error.message);
  updateTag("organizations");
  revalidatePath("/[locale]/partner", "layout");
  return { ok: true };
}

// ---------------- opportunities ----------------
function parseQuestions(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((label, i) => ({ id: `q${i + 1}`, label: label.slice(0, 300), required: true }));
}

export async function saveOpportunity(input: unknown, id?: string): Promise<ActionResult<string>> {
  const ctx = await actionContext(REVIEWERS);
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(opportunitySchema, input);
  if (!parsed.ok) return parsed.result;
  const { questions_text, submit, ...fields } = parsed.data;
  const row = { ...fields, questions: parseQuestions(questions_text) };

  if (id) {
    const { data: current } = await ctx.supabase.from("opportunities").select("status").eq("id", id).maybeSingle();
    if (!current) return fail("errors.forbidden");
    const status = submit && current.status === "draft" ? "pending_review" : current.status;
    const { error } = await ctx.supabase.from("opportunities").update({ ...row, status }).eq("id", id);
    if (error) return dbError(error.message);
    updateTag("opportunities");
    revalidatePath("/[locale]/partner", "layout");
    return { ok: true, data: id };
  }

  const { data: membership } = await ctx.supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", ctx.userId)
    .limit(1)
    .maybeSingle();
  if (!membership) return fail("partner.noOrg");

  // RLS: the user must be a member of the organization; the trigger forces female_ratio = 0.75.
  const { data, error } = await ctx.supabase
    .from("opportunities")
    .insert({
      ...row,
      organization_id: membership.organization_id,
      created_by: ctx.userId,
      slug: `${slugify(fields.title)}-${crypto.randomUUID().slice(0, 6)}`,
      status: submit ? "pending_review" : "draft",
    })
    .select("id")
    .single();
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/partner", "layout");
  return { ok: true, data: data.id };
}

export async function closeOpportunity(id: string): Promise<ActionResult> {
  const ctx = await actionContext(REVIEWERS);
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("opportunities").update({ status: "closed" }).eq("id", id).eq("status", "published");
  if (error) return dbError(error.message);
  updateTag("opportunities");
  revalidatePath("/[locale]/partner", "layout");
  return { ok: true };
}

// ---------------- applicant review ----------------
const statusSchema = z.enum(["under_review", "shortlisted", "rejected", "waitlisted"]);

/** Any status change except 'accepted' (which must go through the quota function). */
export async function setApplicationStatus(appId: string, status: ApplicationStatus): Promise<ActionResult> {
  const ctx = await actionContext(REVIEWERS);
  if ("error" in ctx) return ctx.error!;
  const s = statusSchema.safeParse(status);
  if (!s.success) return fail("validation.invalid");
  const { data, error } = await ctx.supabase.from("applications").update({ status: s.data }).eq("id", appId).select("id");
  if (error) return dbError(error.message);
  if (!data?.length) return fail("errors.forbidden"); // RLS filtered the row out
  updateTag("seats");
  revalidatePath("/[locale]/partner", "layout");
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true };
}

/** The ONLY way to accept: the database locks the opportunity and enforces the 75/25 seats. */
export async function acceptApplication(appId: string): Promise<ActionResult<"accepted" | "waitlisted">> {
  const ctx = await actionContext(REVIEWERS);
  if ("error" in ctx) return ctx.error!;
  const { data, error } = await ctx.supabase.rpc("accept_application", { app_id: appId });
  if (error) return dbError(error.message);
  updateTag("seats");
  updateTag("stats");
  revalidatePath("/[locale]/partner", "layout");
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, data: data as "accepted" | "waitlisted" };
}

const reviewSchema = z.object({
  application_id: z.string().uuid(),
  score: z.union([z.literal(""), z.coerce.number().int().min(1).max(10)]).optional().transform((v) => (v === "" || v == null ? null : v)),
  notes: z.string().trim().max(2000, "maxChars:2000").optional().transform((v) => (v ? v : null)),
});

export async function addReview(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext(REVIEWERS);
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(reviewSchema, input);
  if (!parsed.ok) return parsed.result;
  if (!parsed.data.notes && !parsed.data.score) return fail("validation.required");
  const { error } = await ctx.supabase.from("application_reviews").insert({ ...parsed.data, reviewer_id: ctx.userId });
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/partner", "layout");
  return { ok: true };
}
