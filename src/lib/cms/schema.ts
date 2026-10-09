/**
 * Builds zod validation from CMS field definitions. The server parses every save with this —
 * the admin form is never trusted. Error messages are plain English (admin UI).
 */
import { z } from "zod";
import type { FieldDef } from "./fields";

const EAT_OFFSET = "+03:00"; // Somalia (East Africa Time), no daylight saving

/** "2026-10-08T14:30" (entered in Somalia time) → ISO timestamp. */
export function eatLocalToIso(v: string) {
  return new Date(`${v}:00${EAT_OFFSET}`).toISOString();
}
/** ISO timestamp → "2026-10-08T14:30" in Somalia time (for <input type="datetime-local">). */
export function isoToEatLocal(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16);
}

const SAFE_URL = /^https?:\/\/[^\s<>"']+$/i;
const RELATIVE = /^\/(?!\/)[^\s<>"']*$/;
const MAILTO = /^mailto:[^\s<>"']+$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const trimmed = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);
const optionalText = (max: number) => trimmed(max).optional().nullable().transform((v) => (v ? v : null));

function urlSchema(allowRelative: boolean, required: boolean) {
  const base = z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || SAFE_URL.test(v) || (allowRelative && (RELATIVE.test(v) || MAILTO.test(v))), {
      message: allowRelative ? "Enter a full URL (https://…) or a site path (/about)" : "Enter a full URL starting with https://",
    });
  return required
    ? base.refine((v) => v !== "", "Required")
    : base.optional().nullable().transform((v) => (v ? v : null));
}

const mediaUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || SAFE_URL.test(v) || RELATIVE.test(v), "Invalid file URL");

export function fieldSchema(f: FieldDef): z.ZodType {
  const req = f.required ?? false;
  switch (f.kind) {
    case "text": {
      const max = f.max ?? 300;
      return req ? trimmed(max).min(1, "Required") : optionalText(max);
    }
    case "textarea":
    case "richtext": {
      const max = f.max ?? (f.kind === "richtext" ? 50000 : 2000);
      return req ? trimmed(max).min(1, "Required") : optionalText(max);
    }
    case "slug":
      return z.string().trim().toLowerCase().min(1, "Required").max(100).regex(SLUG, "Use lowercase letters, numbers and single dashes");
    case "email":
      return req
        ? z.string().trim().toLowerCase().email("Enter a valid email")
        : z.string().trim().toLowerCase().email("Enter a valid email").or(z.literal("")).optional().nullable().transform((v) => (v ? v : null));
    case "number": {
      let n = z.coerce.number({ message: "Enter a number" });
      if (f.integer) n = n.int("Whole numbers only");
      if (f.min != null) n = n.min(f.min, `Minimum ${f.min}`);
      if (f.max != null) n = n.max(f.max, `Maximum ${f.max}`);
      const empty = z.union([z.literal(""), z.null(), z.undefined()]).transform(() => null);
      return req ? n : z.union([empty, n]);
    }
    case "url":
      return urlSchema(f.allowRelative ?? false, req);
    case "date": {
      const d = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker");
      return req ? d : z.union([z.literal(""), d]).optional().nullable().transform((v) => (v ? v : null));
    }
    case "datetime": {
      const d = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use the date picker").transform(eatLocalToIso);
      return req ? d : z.union([z.literal("").transform(() => null), d]).optional().nullable().transform((v) => v ?? null);
    }
    case "select": {
      const values = f.options.map((o) => o.value) as [string, ...string[]];
      const e = z.union([z.string(), z.number()]).transform(String).pipe(z.enum(values, { message: "Choose an option" }));
      return req ? e : z.union([z.literal("").transform(() => null), e]).optional().nullable().transform((v) => v ?? null);
    }
    case "icon":
      return z.string().max(40).regex(/^[a-z0-9-]*$/).optional().nullable().transform((v) => (v ? v : null));
    case "boolean":
      return z.boolean().optional().default(false);
    case "tags":
    case "list":
      return z.array(z.string().trim().min(1).max(300)).max(f.max ?? 30, "Too many items").default([]);
    case "image":
    case "file":
      return req ? mediaUrl.refine((v) => v !== "", "Required") : mediaUrl.optional().nullable().transform((v) => (v ? v : null));
    case "gallery":
      return z.array(mediaUrl.refine((v) => v !== "")).max(f.max ?? 40, "Too many images").default([]);
    case "documents":
      return z.array(z.object({ name: trimmed(160).min(1, "Name required"), url: mediaUrl.refine((v) => v !== "") })).max(30).default([]);
    case "relation": {
      const id = z.string().regex(UUID, "Invalid selection");
      return req ? id : z.union([z.literal(""), id]).optional().nullable().transform((v) => (v ? v : null));
    }
    case "relation_multi":
      return z.array(z.string().regex(UUID)).max(f.max ?? 50).default([]);
    case "link":
      return z
        .object({ label: trimmed(60).optional().default(""), href: urlSchema(true, false) })
        .optional()
        .nullable()
        .transform((v) => (v && v.label && v.href ? { label: v.label, href: v.href } : null));
    case "repeater":
      return z.array(objectSchema(f.fields)).max(f.max ?? 50, "Too many items").default([]);
    case "speakers":
      return z
        .array(
          z.object({
            name: trimmed(120).min(1, "Name required"),
            role_title: optionalText(160),
            bio: optionalText(2000),
            image_url: mediaUrl.optional().nullable().transform((v) => (v ? v : null)),
          }),
        )
        .max(30)
        .default([]);
  }
}

export function objectSchema(fields: FieldDef[]) {
  return z.object(Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f)])));
}

/** First error per field path ("items.2.title"), for showing next to inputs. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
