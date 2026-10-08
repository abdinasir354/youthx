"use server";

import { revalidatePath, updateTag } from "next/cache";
import { actionContext, dbError, fail, parse, type ActionResult } from "@/lib/action";
import { profileSchema } from "@/lib/validations";

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  const parsed = parse(profileSchema, input);
  if (!parsed.ok) return parsed.result;

  const { mentor_expertise, mentor_availability, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest, onboarded: true };
  if (ctx.profile.role === "mentor") Object.assign(update, { mentor_expertise, mentor_availability });

  // RLS: "profiles: update own"; the trigger silently keeps role/is_mentor_approved unchanged.
  const { error } = await ctx.supabase.from("profiles").update(update).eq("id", ctx.userId);
  if (error) return dbError(error.message);
  if (ctx.profile.role === "mentor") updateTag("mentors");
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/**
 * Files are uploaded straight from the browser to Storage (RLS restricts writes to "<uid>/…"),
 * then the path is saved here. We re-check the folder so nobody can point at someone else's file.
 */
export async function setProfileFile(kind: "avatar" | "cv", path: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  if (typeof path !== "string" || !path.startsWith(`${ctx.userId}/`) || path.includes("..")) return fail("validation.invalid");

  let update: Record<string, string>;
  if (kind === "avatar") {
    const { data } = ctx.supabase.storage.from("avatars").getPublicUrl(path);
    update = { avatar_url: data.publicUrl };
  } else {
    update = { cv_path: path };
  }
  const { error } = await ctx.supabase.from("profiles").update(update).eq("id", ctx.userId);
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/** Short-lived (60 s) signed URL for a CV. Storage RLS decides who may read which CV. */
export async function getCvUrl(path: string): Promise<ActionResult<string>> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error!;
  if (typeof path !== "string" || path.includes("..")) return fail("validation.invalid");
  const { data, error } = await ctx.supabase.storage.from("cvs").createSignedUrl(path, 60);
  if (error || !data) return fail("errors.forbidden");
  return { ok: true, data: data.signedUrl };
}
