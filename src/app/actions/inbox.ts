"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, dbError, fail, type ActionResult } from "@/lib/action";
import { REVIEWS, REVIEW_STATUSES, type ReviewKind } from "@/lib/cms/reviews";
import { toCsv } from "@/lib/utils";

const uuid = z.string().uuid();
const kindSchema = z.enum(["volunteer", "mentor"]);

function refresh(kind: ReviewKind) {
  revalidatePath(`/[locale]${REVIEWS[kind].path}`, "layout");
  revalidatePath("/[locale]/admin", "page");
}

/** Change the review status. Approving a mentor also makes their account an approved mentor. */
export async function setReviewStatus(kind: ReviewKind, id: string, status: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "people" });
  if ("error" in ctx) return ctx.error!;
  if (!kindSchema.safeParse(kind).success || !uuid.safeParse(id).success || !(REVIEW_STATUSES as readonly string[]).includes(status)) return fail("Invalid request.");
  if (kind === "mentor" && status === "approved") {
    const { error } = await ctx.supabase.rpc("approve_mentor_application", { app_id: id });
    if (error) return dbError(error.message);
  } else {
    const { error } = await ctx.supabase.from(REVIEWS[kind].table).update({ status }).eq("id", id);
    if (error) return dbError(error.message);
  }
  refresh(kind);
  return { ok: true };
}

export async function saveReviewNotes(kind: ReviewKind, id: string, notes: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "people" });
  if ("error" in ctx) return ctx.error!;
  if (!kindSchema.safeParse(kind).success || !uuid.safeParse(id).success) return fail("Invalid request.");
  const { error } = await ctx.supabase.from(REVIEWS[kind].table).update({ admin_notes: notes.trim().slice(0, 5000) || null }).eq("id", id);
  if (error) return dbError(error.message);
  refresh(kind);
  return { ok: true };
}

/** Private CV: a signed link that works for 60 seconds. */
export async function reviewCvUrl(kind: ReviewKind, id: string): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "people" });
  if ("error" in ctx) return ctx.error!;
  if (!kindSchema.safeParse(kind).success || !uuid.safeParse(id).success) return fail("Invalid request.");
  const { data: row } = await ctx.supabase.from(REVIEWS[kind].table).select("cv_path").eq("id", id).maybeSingle();
  if (!row?.cv_path) return fail("No CV was uploaded.");
  const { data, error } = await ctx.supabase.storage.from("applications").createSignedUrl(row.cv_path, 60, { download: true });
  if (error || !data) return dbError(error?.message);
  return { ok: true, data: data.signedUrl };
}

export async function setMessageArchived(id: string, archived: boolean): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "inbox" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("contact_messages").update({ is_archived: archived, is_read: true }).eq("id", id);
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/admin/messages", "page");
  return { ok: true };
}

export async function setSubscriberStatus(id: string, status: "subscribed" | "unsubscribed"): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "inbox" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success || !["subscribed", "unsubscribed"].includes(status)) return fail("Invalid request.");
  const { error } = await ctx.supabase
    .from("newsletter_subscribers")
    .update({ status, unsubscribed_at: status === "unsubscribed" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/admin/newsletter", "page");
  return { ok: true };
}

export async function exportSubscribersCsv(): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "inbox" });
  if ("error" in ctx) return ctx.error!;
  const { data, error } = await ctx.supabase.from("newsletter_subscribers").select("email, status, created_at, unsubscribed_at").eq("status", "subscribed").order("created_at").limit(50000);
  if (error) return dbError(error.message);
  await ctx.supabase.rpc("log_admin_event", { p_action: "export", p_details: { what: "newsletter_subscribers", rows: data?.length ?? 0 } });
  return { ok: true, data: toCsv(data ?? []) };
}
