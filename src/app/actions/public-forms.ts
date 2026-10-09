"use server";

import { randomUUID } from "node:crypto";
import { createAdminClient, serviceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fail, parse, type ActionResult } from "@/lib/action";
import { isBot, rateLimit } from "@/lib/rate-limit";
import { contactSchema, donationSchema, mentorApplicationSchema, newsletterSchema, partnerRequestSchema, volunteerSchema } from "@/lib/validations";

/**
 * Public forms: zod validation + honeypot + IP rate limit. RLS allows anonymous INSERT only;
 * triggers force the initial status so a crafted request can't mark itself "confirmed".
 */

export async function sendContactMessage(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(contactSchema, input);
  if (!parsed.ok) return parsed.result;
  const { website, ...row } = parsed.data;
  if (isBot({ website })) return { ok: true }; // pretend success for bots
  if (!(await rateLimit("contact", 5, 600))) return fail("common.tooManyRequests");

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(row);
  if (error) {
    console.error("[contact]", error.message);
    return fail("common.error");
  }
  return { ok: true };
}

export async function sendPartnerRequest(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(partnerRequestSchema, input);
  if (!parsed.ok) return parsed.result;
  const { website, ...row } = parsed.data;
  if (isBot({ website })) return { ok: true };
  if (!(await rateLimit("partner", 3, 3600))) return fail("common.tooManyRequests");

  const supabase = await createClient();
  const { error } = await supabase.from("partner_requests").insert(row);
  if (error) {
    console.error("[partner_request]", error.message);
    return fail("common.error");
  }
  return { ok: true };
}

export async function recordDonation(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(donationSchema, input);
  if (!parsed.ok) return parsed.result;
  const { website, ...row } = parsed.data;
  if (isBot({ website })) return { ok: true };
  if (!(await rateLimit("donate", 5, 3600))) return fail("common.tooManyRequests");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  const { error } = await supabase.from("donations").insert({ ...row, user_id: userId });
  if (error) {
    console.error("[donation]", error.message);
    return fail("common.error");
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Newsletter, volunteer and mentor applications
// ---------------------------------------------------------------------------

export async function subscribeNewsletter(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  const parsed = parse(newsletterSchema, input);
  if (!parsed.ok) return parsed.result;
  if (isBot(parsed.data)) return { ok: true };
  if (!(await rateLimit("newsletter", 5, 3600))) return fail("common.tooManyRequests");
  const supabase = await createClient();
  // The function never reveals whether the address was already subscribed.
  const { error } = await supabase.rpc("newsletter_subscribe", { p_email: parsed.data.email });
  if (error) {
    console.error("[newsletter]", error.message);
    return fail("common.error");
  }
  return { ok: true };
}

export async function unsubscribeNewsletter(token: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  if (!/^[0-9a-f-]{36}$/i.test(token)) return fail("validation.invalid");
  if (!(await rateLimit("unsubscribe", 20, 3600))) return fail("common.tooManyRequests");
  const supabase = await createClient();
  const { error } = await supabase.rpc("newsletter_unsubscribe", { p_token: token });
  if (error) return fail("common.error");
  return { ok: true };
}

const CV_MAX_BYTES = 5 * 1024 * 1024;

/** Validates an optional CV (PDF, ≤ 5 MB, real PDF signature) and stores it in the private bucket. */
async function storeApplicationCv(file: FormDataEntryValue | null, folder: "volunteer" | "mentor"): Promise<{ path: string | null } | { error: ActionResult<never> }> {
  if (!(file instanceof File) || file.size === 0) return { path: null };
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) return { error: fail("pdfOnly") };
  if (file.size > CV_MAX_BYTES) return { error: fail("fileTooBig:5") };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return { error: fail("pdfOnly") };
  if (!serviceRoleKey()) return { error: fail("common.notConfigured") };
  const path = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.pdf`;
  // Anonymous applicants can't write to storage themselves; the server uploads after validating.
  const { error } = await createAdminClient().storage.from("applications").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) {
    console.error("[cv upload]", error.message);
    return { error: fail("common.error") };
  }
  return { path };
}

async function submitReviewApplication(kind: "volunteer" | "mentor", formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("common.notConfigured");
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("data") ?? "{}"));
  } catch {
    return fail("validation.invalid");
  }
  const parsed = kind === "volunteer" ? parse(volunteerSchema, raw) : parse(mentorApplicationSchema, raw);
  if (!parsed.ok) return parsed.result;
  const { website, ...row } = parsed.data;
  if (isBot({ website })) return { ok: true };
  if (!(await rateLimit(`${kind}-apply`, 3, 3600))) return fail("common.tooManyRequests");

  const cv = await storeApplicationCv(formData.get("cv"), kind);
  if ("error" in cv) return cv.error;

  const supabase = await createClient();
  const table = kind === "volunteer" ? "volunteer_applications" : "mentor_applications";
  const { error } = await supabase.from(table).insert({ ...row, cv_path: cv.path });
  if (error) {
    if (cv.path) await createAdminClient().storage.from("applications").remove([cv.path]);
    console.error(`[${kind} application]`, error.message);
    return fail("common.error");
  }
  return { ok: true };
}

export async function submitVolunteerApplication(formData: FormData): Promise<ActionResult> {
  return submitReviewApplication("volunteer", formData);
}

export async function submitMentorApplication(formData: FormData): Promise<ActionResult> {
  return submitReviewApplication("mentor", formData);
}
