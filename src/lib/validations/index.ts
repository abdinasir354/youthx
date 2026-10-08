/**
 * Zod schemas shared by client forms (react-hook-form) and Server Actions.
 * Error messages are translation keys from messages/*.json → "validation" namespace,
 * optionally with a parameter: "minChars:50".
 */
import { z } from "zod";
import { EDUCATION_LEVELS, OPPORTUNITY_TYPES, REGIONS } from "@/types/database.types";

const req = (max = 200) => z.string().trim().min(1, "required").max(max, `maxChars:${max}`);
const opt = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `maxChars:${max}`)
    .optional()
    .transform((v) => (v ? v : null));
const email = z.string().trim().toLowerCase().min(1, "required").email("email").max(200);
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+0-9 ()-]{7,30}$/, "phone");
const optPhone = z.union([z.literal(""), phone]).optional().transform((v) => (v ? v : null));
const password = z.string().min(8, "minChars:8").max(72, "maxChars:72");
const honeypot = z.string().max(0).optional();
const csv = z
  .string()
  .max(500)
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20),
  );

// ---------- auth ----------
export const loginSchema = z.object({ email, password: z.string().min(1, "required") });
export const signupSchema = z
  .object({
    full_name: req(120),
    email,
    password,
    confirm: z.string(),
    website: honeypot,
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "passwordsMatch" });
export const emailOnlySchema = z.object({ email, website: honeypot });
export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "passwordsMatch" });

// ---------- profile ----------
const dob = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (!v) return true;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 15 && age < 36;
  }, "age");

export const profileSchema = z.object({
  full_name: req(120),
  gender: z.enum(["female", "male"], { message: "required" }),
  date_of_birth: dob,
  region: z.union([z.literal(""), z.enum(REGIONS)]).optional().transform((v) => (v ? v : null)),
  district: opt(80),
  phone: optPhone,
  education_level: z.union([z.literal(""), z.enum(EDUCATION_LEVELS as [string, ...string[]])]).optional().transform((v) => (v ? v : null)),
  skills: csv,
  languages: csv,
  bio: opt(1000),
  preferred_language: z.enum(["so", "en"]).default("en"),
  mentor_expertise: csv,
  mentor_availability: opt(200),
});
export type ProfileInput = z.input<typeof profileSchema>;

// ---------- applications ----------
export const applySchema = z.object({
  opportunity_id: z.string().uuid(),
  motivation: z.string().trim().min(50, "minChars:50").max(3000, "maxChars:3000"),
  cv_path: z.string().max(300).optional().transform((v) => (v ? v : null)),
  answers: z.record(z.string(), z.string().max(2000, "maxChars:2000")).default({}),
});

// ---------- partner: organization & opportunity ----------
export const organizationSchema = z.object({
  name: req(150),
  type: z.enum(["ngo", "company", "university", "government", "other"]),
  website: z.union([z.literal(""), z.string().trim().url("url").max(300)]).optional().transform((v) => (v ? v : null)),
  description: opt(3000),
  logo_url: z.string().url().max(500).optional().nullable(),
});

// Dates are entered as YYYY-MM-DD and interpreted in Somalia time (UTC+3), whatever the server's timezone.
const isoDay = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid")]).optional();
const startOfDay = isoDay.transform((v) => (v ? new Date(`${v}T00:00:00+03:00`).toISOString() : null));
const endOfDay = isoDay.transform((v) => (v ? new Date(`${v}T23:59:59+03:00`).toISOString() : null));

/** ISO timestamp → YYYY-MM-DD in Somalia time (for form default values). */
export function toEatDay(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export const opportunitySchema = z
  .object({
    title: req(160),
    type: z.enum(OPPORTUNITY_TYPES as [string, ...string[]]),
    summary: opt(300),
    description: opt(10000),
    requirements: opt(5000),
    region: z.union([z.literal(""), z.enum(REGIONS)]).optional().transform((v) => (v ? v : null)),
    is_remote: z.boolean().default(false),
    capacity: z
      .union([z.literal(""), z.coerce.number().int("invalid").positive("positive").max(100000)])
      .optional()
      .transform((v) => (v === "" || v == null ? null : v)),
    min_age: z.coerce.number().int().min(15, "age").max(35, "age").default(15),
    max_age: z.coerce.number().int().min(15, "age").max(35, "age").default(35),
    apply_deadline: endOfDay,
    starts_at: startOfDay,
    ends_at: endOfDay,
    questions_text: z.string().max(3000).optional().default(""),
    submit: z.boolean().default(false),
  })
  .refine((v) => v.min_age <= v.max_age, { path: ["max_age"], message: "invalid" });
export type OpportunityInput = z.input<typeof opportunitySchema>;

// ---------- public forms ----------
export const contactSchema = z.object({
  name: req(120),
  email: z.union([z.literal(""), email]).optional().transform((v) => (v ? v : null)),
  phone: optPhone,
  subject: opt(200),
  message: z.string().trim().min(10, "minChars:10").max(5000, "maxChars:5000"),
  website: honeypot,
});

export const partnerRequestSchema = z.object({
  org_name: req(150),
  contact_name: req(120),
  email,
  phone: optPhone,
  message: opt(3000),
  website: honeypot,
});

export const donationSchema = z.object({
  donor_name: opt(120),
  donor_email: z.union([z.literal(""), email]).optional().transform((v) => (v ? v : null)),
  donor_phone: optPhone,
  amount: z.coerce.number({ message: "required" }).positive("positive").max(1_000_000),
  currency: z.enum(["USD", "SOS"]).default("USD"),
  method: z.enum(["evc_plus", "zaad", "sahal", "bank", "other"]),
  reference: req(100),
  message: opt(1000),
  is_anonymous: z.boolean().default(false),
  website: honeypot,
});

// ---------- mentorship ----------
export const mentorshipRequestSchema = z.object({
  mentor_id: z.string().uuid(),
  topic: req(150),
  message: opt(2000),
});

// ---------- admin content ----------
export const courseSchema = z.object({
  id: z.string().uuid().optional(),
  title: req(160),
  slug: z.string().trim().min(1, "required").max(100).regex(/^[a-z0-9-]+$/, "invalid"),
  description: opt(5000),
  category: opt(80),
  level: opt(40),
  language: z.enum(["so", "en"]).default("en"),
  cover_url: z.union([z.literal(""), z.string().url("url")]).optional().transform((v) => (v ? v : null)),
  is_published: z.boolean().default(false),
});

export const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid(),
  title: req(160),
  content: opt(20000),
  video_url: z.union([z.literal(""), z.string().url("url")]).optional().transform((v) => (v ? v : null)),
  position: z.coerce.number().int().min(0).default(0),
  duration_minutes: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export const postSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["news", "story"]),
  title: req(160),
  slug: z.string().trim().min(1, "required").max(100).regex(/^[a-z0-9-]+$/, "invalid"),
  excerpt: opt(400),
  body: opt(50000),
  cover_url: z.union([z.literal(""), z.string().url("url")]).optional().transform((v) => (v ? v : null)),
  language: z.enum(["so", "en"]).default("en"),
  is_published: z.boolean().default(false),
});

// ---------- files (checked client-side before upload; buckets enforce the same limits) ----------
export const FILE_LIMITS = {
  cv: { maxMb: 5, types: ["application/pdf"] },
  image: { maxMb: 2, types: ["image/jpeg", "image/png", "image/webp"] },
} as const;
