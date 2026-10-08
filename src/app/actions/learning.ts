"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, dbError, fail, parse, type ActionResult } from "@/lib/action";
import { mentorshipRequestSchema } from "@/lib/validations";

// ---------------- courses ----------------
export async function enrollInCourse(courseId: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("enrollments").upsert({ user_id: ctx.userId, course_id: courseId }, { ignoreDuplicates: true });
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/dashboard/courses", "page");
  return { ok: true };
}

export async function setLessonComplete(lessonId: string, courseId: string, done: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  // Make sure the user is enrolled (auto-enroll on first completed lesson).
  await ctx.supabase.from("enrollments").upsert({ user_id: ctx.userId, course_id: courseId }, { ignoreDuplicates: true });
  const q = done
    ? ctx.supabase.from("lesson_progress").upsert({ user_id: ctx.userId, lesson_id: lessonId }, { ignoreDuplicates: true })
    : ctx.supabase.from("lesson_progress").delete().eq("user_id", ctx.userId).eq("lesson_id", lessonId);
  const { error } = await q;
  if (error) return dbError(error.message);
  return { ok: true };
}

// ---------------- mentorship ----------------
export async function requestMentorship(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(mentorshipRequestSchema, input);
  if (!parsed.ok) return parsed.result;
  if (parsed.data.mentor_id === ctx.userId) return fail("validation.invalid");

  const { count } = await ctx.supabase
    .from("mentorship_requests")
    .select("id", { count: "exact", head: true })
    .eq("mentee_id", ctx.userId)
    .eq("mentor_id", parsed.data.mentor_id)
    .eq("status", "pending");
  if (count) return fail("mentorship.alreadyRequested");

  const { error } = await ctx.supabase.from("mentorship_requests").insert({ ...parsed.data, mentee_id: ctx.userId });
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/dashboard/mentorship", "page");
  return { ok: true };
}

export async function cancelMentorship(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  const { error } = await ctx.supabase.from("mentorship_requests").update({ status: "cancelled" }).eq("id", id).eq("mentee_id", ctx.userId);
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/dashboard/mentorship", "page");
  return { ok: true };
}

const respondSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["accepted", "declined", "completed"]),
  response_message: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
});

export async function respondToMentorship(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext({ roles: ["mentor"] });
  if ("error" in ctx) return ctx.error!;
  if (ctx.profile.role === "mentor" && !ctx.profile.is_mentor_approved) return fail("errors.forbidden");
  const parsed = parse(respondSchema, input);
  if (!parsed.ok) return parsed.result;
  const { id, ...update } = parsed.data;
  const { error } = await ctx.supabase.from("mentorship_requests").update(update).eq("id", id).eq("mentor_id", ctx.userId);
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/mentor", "layout");
  return { ok: true };
}

// ---------------- notifications ----------------
export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  let q = ctx.supabase.from("notifications").update({ is_read: true }).eq("user_id", ctx.userId).eq("is_read", false);
  if (ids?.length) q = q.in("id", ids);
  const { error } = await q;
  if (error) return dbError(error.message);
  return { ok: true };
}
