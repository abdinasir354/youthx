"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { actionContext, dbError, fail, type ActionResult } from "@/lib/action";
import { getCollection, statusesFor } from "@/lib/cms/collections";
import type { FieldDef } from "@/lib/cms/fields";
import { objectSchema, zodFieldErrors } from "@/lib/cms/schema";
import { SECTION_TYPES, SECTIONS, type SectionType } from "@/lib/cms/sections";
import { markdownToSafeHtml } from "@/lib/markdown";
import { canPublish } from "@/lib/permissions";
import { SOCIAL_NETWORKS } from "@/lib/cms/settings";

const uuid = z.string().uuid();
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function refreshAdmin() {
  revalidatePath("/[locale]/admin", "layout");
}

function tagAll(tags: string[]) {
  for (const t of new Set(tags)) updateTag(t);
}

/** Field kinds stored outside the main row. */
const SIDE_KINDS = new Set<FieldDef["kind"]>(["speakers"]);
const SIDE_NAMES = new Set(["partner_ids"]);

function validation(error: z.ZodError): ActionResult<never> {
  return fail("Please fix the highlighted fields.", zodFieldErrors(error));
}

function duplicateSlug(message: string) {
  return message.includes("duplicate key") && message.includes("slug");
}

// =====================================================================================
// Collections (programs, events, opportunities, projects, resources, stories, faqs, ...)
// =====================================================================================

export type SaveIntent = "save" | "publish";

export async function saveEntry(
  collection: string,
  id: string | null,
  values: unknown,
  intent: SaveIntent = "save",
): Promise<ActionResult<{ id: string; slug: string | null }>> {
  const def = getCollection(collection);
  if (!def) return fail("Unknown content type.");
  const ctx = await actionContext({ perm: def.perm });
  if ("error" in ctx) return ctx.error!;
  if (id && !uuid.safeParse(id).success) return fail("Invalid id.");

  const parsed = objectSchema(def.fields).safeParse(values);
  if (!parsed.success) return validation(parsed.error);
  const data = parsed.data as Record<string, unknown>;

  // Cross-field rules
  if (def.key === "opportunities") {
    if (data.apply_mode === "external" && !data.application_url) {
      return fail("Please fix the highlighted fields.", { application_url: "Required for external applications" });
    }
    if (data.female_ratio == null) delete data.female_ratio;
  }
  if (def.key === "events" && data.ends_at && data.starts_at && String(data.ends_at) < String(data.starts_at)) {
    return fail("Please fix the highlighted fields.", { ends_at: "Must be after the start" });
  }

  const row: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (SIDE_KINDS.has(f.kind) || SIDE_NAMES.has(f.name)) continue;
    row[f.name] = data[f.name];
  }

  if (def.statusSet !== "none") {
    if (intent === "publish") {
      if (!canPublish(ctx.adminRole)) return fail("Your role can save drafts but not publish. Ask a Content Admin to publish.");
      row.status = "published";
    } else if (!id) {
      row.status = "draft";
    }
  }

  const q = id
    ? ctx.supabase.from(def.table).update(row).eq("id", id).select("id").single()
    : ctx.supabase.from(def.table).insert(row).select("id").single();
  const { data: saved, error } = await q;
  if (error) {
    if (duplicateSlug(error.message)) return fail("Please fix the highlighted fields.", { slug: "This slug is already used" });
    if (error.message.includes("Consent required")) return fail("This story can't be published until consent is Granted.", { consent_status: "Consent must be Granted to publish" });
    return dbError(error.message);
  }
  const entryId = saved.id as string;

  // Related rows
  if (def.key === "events") {
    const speakers = (data.speakers as { name: string; role_title: string | null; bio: string | null; image_url: string | null }[]) ?? [];
    const del = await ctx.supabase.from("event_speakers").delete().eq("event_id", entryId);
    if (del.error) return dbError(del.error.message);
    if (speakers.length) {
      const ins = await ctx.supabase.from("event_speakers").insert(speakers.map((s, i) => ({ ...s, event_id: entryId, position: i })));
      if (ins.error) return dbError(ins.error.message);
    }
  }
  if (def.key === "projects") {
    const partnerIds = (data.partner_ids as string[]) ?? [];
    const del = await ctx.supabase.from("project_partners").delete().eq("project_id", entryId);
    if (del.error) return dbError(del.error.message);
    if (partnerIds.length) {
      const ins = await ctx.supabase.from("project_partners").insert(partnerIds.map((p) => ({ project_id: entryId, partner_id: p })));
      if (ins.error) return dbError(ins.error.message);
    }
  }

  tagAll(def.tags);
  refreshAdmin();
  return { ok: true, data: { id: entryId, slug: (data.slug as string | undefined) ?? null } };
}

export async function setEntryStatus(collection: string, id: string, status: string): Promise<ActionResult> {
  const def = getCollection(collection);
  if (!def || def.statusSet === "none") return fail("Unknown content type.");
  const ctx = await actionContext({ perm: def.perm });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success || !statusesFor(def.statusSet).includes(status)) return fail("Invalid request.");
  if (status === "published" && !canPublish(ctx.adminRole)) return fail("Your role can save drafts but not publish.");
  const { error } = await ctx.supabase.from(def.table).update({ status }).eq("id", id);
  if (error) {
    if (error.message.includes("Consent required")) return fail("Set consent to Granted before publishing this story.");
    return dbError(error.message);
  }
  tagAll(def.tags);
  refreshAdmin();
  return { ok: true };
}

export async function setEntryFlag(collection: string, id: string, flag: "is_featured" | "is_visible", value: boolean): Promise<ActionResult> {
  const def = getCollection(collection);
  if (!def) return fail("Unknown content type.");
  if ((flag === "is_featured" && !def.featurable) || (flag === "is_visible" && !def.visibility)) return fail("Invalid request.");
  const ctx = await actionContext({ perm: def.perm });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { error } = await ctx.supabase.from(def.table).update({ [flag]: value }).eq("id", id);
  if (error) return dbError(error.message);
  tagAll(def.tags);
  refreshAdmin();
  return { ok: true };
}

export async function deleteEntry(collection: string, id: string): Promise<ActionResult> {
  const def = getCollection(collection);
  if (!def) return fail("Unknown content type.");
  const ctx = await actionContext({ perm: def.perm });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { data, error } = await ctx.supabase.from(def.table).delete().eq("id", id).select("id");
  if (error) return dbError(error.message);
  if (!data?.length) return fail("You don't have permission to delete this.");
  tagAll(def.tags);
  refreshAdmin();
  return { ok: true };
}

/** Drag-and-drop ordering: `ids` in their new order. */
export async function reorderEntries(collection: string, ids: string[]): Promise<ActionResult> {
  const def = getCollection(collection);
  if (!def?.sortable) return fail("This list can't be reordered.");
  const ctx = await actionContext({ perm: def.perm });
  if ("error" in ctx) return ctx.error!;
  const parsed = z.array(uuid).max(500).safeParse(ids);
  if (!parsed.success) return fail("Invalid request.");
  const results = await Promise.all(parsed.data.map((rowId, i) => ctx.supabase.from(def.table).update({ position: i }).eq("id", rowId)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbError(failed.error.message);
  tagAll(def.tags);
  refreshAdmin();
  return { ok: true };
}

// =====================================================================================
// Pages + sections (page builder)
// =====================================================================================

const pageSettingsSchema = z.object({
  title: z.string().trim().min(1, "Required").max(160),
  slug: z.string().trim().toLowerCase().min(1, "Required").max(100).regex(SLUG, "Use lowercase letters, numbers and single dashes"),
  description: z.string().trim().max(600).optional().nullable().transform((v) => (v ? v : null)),
  seo_title: z.string().trim().max(70).optional().nullable().transform((v) => (v ? v : null)),
  seo_description: z.string().trim().max(170).optional().nullable().transform((v) => (v ? v : null)),
  og_image_url: z.string().trim().max(2000).refine((v) => v === "" || /^https?:\/\//.test(v), "Invalid URL").optional().nullable().transform((v) => (v ? v : null)),
});

function pageTags() {
  updateTag("pages");
}

export async function createPage(input: unknown): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const parsed = pageSettingsSchema.pick({ title: true, slug: true }).safeParse(input);
  if (!parsed.success) return validation(parsed.error);
  const { data, error } = await ctx.supabase.from("pages").insert({ ...parsed.data, status: "draft" }).select("id").single();
  if (error) return duplicateSlug(error.message) ? fail("Please fix the highlighted fields.", { slug: "This slug is already used" }) : dbError(error.message);
  refreshAdmin();
  return { ok: true, data: data.id as string };
}

export async function savePageSettings(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const parsed = pageSettingsSchema.safeParse(input);
  if (!parsed.success) return validation(parsed.error);
  const { error } = await ctx.supabase.from("pages").update(parsed.data).eq("id", id);
  if (error) return duplicateSlug(error.message) ? fail("Please fix the highlighted fields.", { slug: "This slug is already used" }) : dbError(error.message);
  pageTags();
  refreshAdmin();
  return { ok: true };
}

/** SEO-only update (Site managers). */
export async function savePageSeo(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "site" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const parsed = pageSettingsSchema.pick({ seo_title: true, seo_description: true, og_image_url: true }).safeParse(input);
  if (!parsed.success) return validation(parsed.error);
  const { error } = await ctx.supabase.from("pages").update(parsed.data).eq("id", id);
  if (error) return dbError(error.message);
  pageTags();
  refreshAdmin();
  return { ok: true };
}

export async function setPageStatus(id: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success || !["draft", "published", "archived"].includes(status)) return fail("Invalid request.");
  if (status === "published" && !canPublish(ctx.adminRole)) return fail("Your role can edit pages but not publish them.");
  const { error } = await ctx.supabase.from("pages").update({ status }).eq("id", id);
  if (error) return dbError(error.message);
  pageTags();
  refreshAdmin();
  return { ok: true };
}

export async function deletePage(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { data, error } = await ctx.supabase.from("pages").delete().eq("id", id).select("id");
  if (error) return error.message.includes("System pages") ? fail("Built-in pages can't be deleted. Unpublish it instead.") : dbError(error.message);
  if (!data?.length) return fail("You don't have permission to delete this page.");
  pageTags();
  refreshAdmin();
  return { ok: true };
}

export type SectionRow = { id: string; page_id: string; type: SectionType; anchor: string | null; position: number; is_visible: boolean; data: Record<string, unknown> };

export async function addSection(pageId: string, type: string, position: number): Promise<ActionResult<SectionRow>> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(pageId).success || !(SECTION_TYPES as readonly string[]).includes(type)) return fail("Invalid request.");
  const def = SECTIONS[type as SectionType];
  const { data, error } = await ctx.supabase
    .from("page_sections")
    .insert({ page_id: pageId, type, position: Math.max(0, Math.floor(position)), data: def.defaults })
    .select("id, page_id, type, anchor, position, is_visible, data")
    .single();
  if (error) return dbError(error.message);
  pageTags();
  return { ok: true, data: data as SectionRow };
}

const anchorSchema = z.string().trim().toLowerCase().max(60).refine((v) => v === "" || SLUG.test(v), "Use lowercase letters, numbers and dashes").transform((v) => (v ? v : null));

export async function saveSection(id: string, input: { data: unknown; anchor?: string }): Promise<ActionResult<Record<string, unknown>>> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { data: current, error: readError } = await ctx.supabase.from("page_sections").select("type").eq("id", id).single();
  if (readError || !current) return fail("Section not found.");
  const def = SECTIONS[current.type as SectionType];
  if (!def) return fail("Unknown section type.");
  const parsed = objectSchema(def.fields).safeParse(input.data);
  if (!parsed.success) return validation(parsed.error);
  const anchor = anchorSchema.safeParse(input.anchor ?? "");
  if (!anchor.success) return fail("Please fix the highlighted fields.", { anchor: anchor.error.issues[0].message });
  const { error } = await ctx.supabase.from("page_sections").update({ data: parsed.data, anchor: anchor.data }).eq("id", id);
  if (error) return dbError(error.message);
  pageTags();
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export async function setSectionVisible(id: string, visible: boolean): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("page_sections").update({ is_visible: visible }).eq("id", id);
  if (error) return dbError(error.message);
  pageTags();
  return { ok: true };
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("page_sections").delete().eq("id", id);
  if (error) return dbError(error.message);
  pageTags();
  return { ok: true };
}

export async function duplicateSection(id: string): Promise<ActionResult<SectionRow>> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { data: s, error: readError } = await ctx.supabase.from("page_sections").select("page_id, type, position, is_visible, data").eq("id", id).single();
  if (readError || !s) return fail("Section not found.");
  const { data, error } = await ctx.supabase
    .from("page_sections")
    .insert({ ...s, position: s.position + 1 })
    .select("id, page_id, type, anchor, position, is_visible, data")
    .single();
  if (error) return dbError(error.message);
  pageTags();
  return { ok: true, data: data as SectionRow };
}

export async function reorderSections(pageId: string, ids: string[]): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "content" });
  if ("error" in ctx) return ctx.error!;
  const parsed = z.array(uuid).max(200).safeParse(ids);
  if (!uuid.safeParse(pageId).success || !parsed.success) return fail("Invalid request.");
  const results = await Promise.all(
    parsed.data.map((sid, i) => ctx.supabase.from("page_sections").update({ position: i }).eq("id", sid).eq("page_id", pageId)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbError(failed.error.message);
  pageTags();
  return { ok: true };
}

/** Safe HTML preview of Markdown for the rich-text editor. */
export async function previewMarkdown(text: string): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "media" });
  if ("error" in ctx) return ctx.error!;
  return { ok: true, data: markdownToSafeHtml(String(text ?? "").slice(0, 60000)) };
}

// =====================================================================================
// Navigation
// =====================================================================================

const navSchema = z.object({
  id: uuid.optional(),
  menu: z.enum(["header", "footer", "legal"]),
  label: z.string().trim().min(1, "Required").max(60),
  href: z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^(\/[a-z0-9/#?=&_-]*|https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+)$/i.test(v), "Use a site path like /about or a full https:// link"),
  open_in_new_tab: z.boolean().default(false),
  is_visible: z.boolean().default(true),
});

export async function saveNavItem(input: unknown): Promise<ActionResult<string>> {
  const ctx = await actionContext({ perm: "site" });
  if ("error" in ctx) return ctx.error!;
  const parsed = navSchema.safeParse(input);
  if (!parsed.success) return validation(parsed.error);
  const { id, ...row } = parsed.data;
  if (id) {
    const { error } = await ctx.supabase.from("navigation_items").update(row).eq("id", id);
    if (error) return dbError(error.message);
    updateTag("navigation");
    return { ok: true, data: id };
  }
  const { count } = await ctx.supabase.from("navigation_items").select("id", { count: "exact", head: true }).eq("menu", row.menu);
  const { data, error } = await ctx.supabase.from("navigation_items").insert({ ...row, position: count ?? 0 }).select("id").single();
  if (error) return dbError(error.message);
  updateTag("navigation");
  return { ok: true, data: data.id as string };
}

export async function deleteNavItem(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "site" });
  if ("error" in ctx) return ctx.error!;
  if (!uuid.safeParse(id).success) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("navigation_items").delete().eq("id", id);
  if (error) return dbError(error.message);
  updateTag("navigation");
  return { ok: true };
}

export async function reorderNav(ids: string[]): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "site" });
  if ("error" in ctx) return ctx.error!;
  const parsed = z.array(uuid).max(100).safeParse(ids);
  if (!parsed.success) return fail("Invalid request.");
  const results = await Promise.all(parsed.data.map((nid, i) => ctx.supabase.from("navigation_items").update({ position: i }).eq("id", nid)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbError(failed.error.message);
  updateTag("navigation");
  return { ok: true };
}

// =====================================================================================
// Site settings
// =====================================================================================

const optText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const optUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s<>"']+$/i.test(v), "Use a full https:// link")
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const settingsSchema = z.object({
  site_name: z.string().trim().min(1, "Required").max(120),
  tagline: optText(200),
  description: optText(600),
  contact_email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional().nullable().transform((v) => (v ? v : null)),
  contact_phone: z.union([z.literal(""), z.string().trim().regex(/^[+0-9 ()-]{7,30}$/, "Enter a valid phone number")]).optional().nullable().transform((v) => (v ? v : null)),
  address: optText(300),
  social: z.object(Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, optUrl]))),
  header_cta_label: z.string().trim().min(1, "Required").max(40),
  header_cta_href: z.string().trim().min(1, "Required").max(300).refine((v) => /^(\/(?!\/)[^\s]*|https?:\/\/\S+)$/.test(v), "Use a site path or https:// link"),
  footer_text: optText(300),
  seo_title: optText(70),
  seo_description: optText(170),
  og_image_url: optUrl,
  newsletter_enabled: z.boolean(),
});

export async function saveSettings(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "settings" });
  if ("error" in ctx) return ctx.error!;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return validation(parsed.error);
  const social = Object.fromEntries(Object.entries(parsed.data.social).filter(([, v]) => v));
  const { error } = await ctx.supabase.from("site_settings").update({ ...parsed.data, social }).eq("id", 1);
  if (error) return dbError(error.message);
  updateTag("settings");
  refreshAdmin();
  return { ok: true };
}

// =====================================================================================
// Opportunities housekeeping
// =====================================================================================

export async function closeExpiredOpportunities(): Promise<ActionResult<number>> {
  const ctx = await actionContext({ perm: "programs" });
  if ("error" in ctx) return ctx.error!;
  const { data, error } = await ctx.supabase.rpc("close_expired_opportunities");
  if (error) return dbError(error.message);
  tagAll(["opportunities", "seats", "stats"]);
  refreshAdmin();
  return { ok: true, data: Number(data ?? 0) };
}
