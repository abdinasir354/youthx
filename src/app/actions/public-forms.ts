"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fail, parse, type ActionResult } from "@/lib/action";
import { isBot, rateLimit } from "@/lib/rate-limit";
import { contactSchema, donationSchema, partnerRequestSchema } from "@/lib/validations";

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
