"use server";

import { revalidatePath, updateTag } from "next/cache";
import { actionContext, dbError, fail, parse, type ActionResult } from "@/lib/action";
import { applySchema } from "@/lib/validations";
import type { Opportunity } from "@/types/database.types";

export async function applyToOpportunity(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(applySchema, input);
  if (!parsed.ok) return parsed.result;
  const { opportunity_id, motivation, cv_path, answers } = parsed.data;

  if (!ctx.profile.gender) return fail("apply.genderRequired");
  if (cv_path && !cv_path.startsWith(`${ctx.userId}/`)) return fail("validation.invalid");

  // Required custom questions must be answered (server-side check of what the client already checked).
  const { data: opp } = await ctx.supabase.from("opportunities").select("questions").eq("id", opportunity_id).maybeSingle();
  if (!opp) return fail("opportunities.deadlinePassed");
  const fieldErrors: Record<string, string> = {};
  for (const q of (opp as Pick<Opportunity, "questions">).questions ?? []) {
    if (q.required && !answers[q.id]?.trim()) fieldErrors[`answers.${q.id}`] = "required";
  }
  if (Object.keys(fieldErrors).length) return fail("validation.invalid", fieldErrors);

  // The trigger fills gender_snapshot, forces status='submitted' and rejects closed / late applications.
  const { error } = await ctx.supabase.from("applications").insert({
    opportunity_id,
    applicant_id: ctx.userId,
    motivation,
    cv_path: cv_path ?? ctx.profile.cv_path,
    answers,
    gender_snapshot: ctx.profile.gender, // overwritten by trigger; required by NOT NULL before trigger runs
  });
  if (error) return dbError(error.message);
  updateTag("seats");
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

export async function withdrawApplication(applicationId: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("applicant_id", ctx.userId);
  if (error) return dbError(error.message);
  updateTag("seats");
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

export async function toggleSaved(opportunityId: string, save: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  const q = save
    ? ctx.supabase.from("saved_opportunities").upsert({ user_id: ctx.userId, opportunity_id: opportunityId })
    : ctx.supabase.from("saved_opportunities").delete().eq("user_id", ctx.userId).eq("opportunity_id", opportunityId);
  const { error } = await q;
  if (error) return dbError(error.message);
  return { ok: true };
}
