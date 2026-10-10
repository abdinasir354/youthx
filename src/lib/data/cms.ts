import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isAdminGuidance } from "@/lib/cms/admin-text";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/cms/settings";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logReadError } from "@/lib/supabase/db-error";
import type { Category, CmsEvent, CmsPage, CmsSection, Faq, NavLink, Partner, Program, Project, Resource, Story } from "@/types/cms";

/**
 * Public, cached CMS reads (anon client → RLS returns published rows only).
 * Every admin save calls updateTag() with the matching tag, so edits show up immediately.
 */

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  if (!isSupabaseConfigured) return DEFAULT_SETTINGS;
  const { data, error } = await createPublicClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
  logReadError("site_settings", error);
  return { ...DEFAULT_SETTINGS, ...((data as Partial<SiteSettings>) ?? {}) };
}

/** Built-in fallback so the site is navigable before the database is set up. */
const FALLBACK_NAV: Record<string, [string, string][]> = {
  header: [["Home", "/"], ["About", "/about"], ["Programs", "/programs"], ["Blog", "/blog"], ["Gallery", "/gallery"]],
  footer: [["About", "/about"], ["Programs", "/programs"], ["Blog", "/blog"], ["Gallery", "/gallery"]],
  legal: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Cookie Policy", "/cookies"]],
};

export async function getNavigation(menu: "header" | "footer" | "legal"): Promise<NavLink[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("navigation");
  const fallback = FALLBACK_NAV[menu].map(([label, href]) => ({ id: href, label, href, open_in_new_tab: false }));
  if (!isSupabaseConfigured) return fallback;
  const { data, error } = await createPublicClient().from("navigation_items").select("id, label, href, open_in_new_tab").eq("menu", menu).eq("is_visible", true).order("position");
  logReadError("navigation", error);
  return error ? fallback : ((data as NavLink[]) ?? []);
}

export async function getPage(slug: string): Promise<{ page: CmsPage; sections: CmsSection[] } | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();
  const { data: page, error } = await supabase.from("pages").select("id, slug, title, description, status, seo_title, seo_description, og_image_url, updated_at").eq("slug", slug).eq("status", "published").maybeSingle();
  logReadError("pages", error);
  if (!page) return null;
  const { data: sections } = await supabase.from("page_sections").select("id, type, anchor, data").eq("page_id", page.id).eq("is_visible", true).order("position");
  return { page: page as CmsPage, sections: (sections as CmsSection[]) ?? [] };
}

// ---------------- programs ----------------
const PROGRAM_COLUMNS = "*, category:program_categories(name, slug)";

export async function getPrograms(): Promise<Program[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("programs");
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient().from("programs").select(PROGRAM_COLUMNS).eq("status", "published").order("position");
  logReadError("programs", error);
  return (data as Program[]) ?? [];
}

export async function getProgram(slug: string): Promise<Program | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("programs");
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient().from("programs").select(PROGRAM_COLUMNS).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as Program) ?? null;
}

export async function getProgramCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("programs");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient().from("program_categories").select("id, name, slug").order("position");
  return (data as Category[]) ?? [];
}

// ---------------- events ----------------
export async function getEvents(): Promise<CmsEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient().from("events").select("*").eq("status", "published").order("starts_at").limit(500);
  logReadError("events", error);
  return (data as CmsEvent[]) ?? [];
}

/** Upcoming = not finished and not cancelled/completed. Computed inside the cache (refreshed every few minutes). */
export async function getUpcomingEvents(): Promise<CmsEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const now = Date.now();
  return (await getEvents()).filter((e) => !["completed", "cancelled"].includes(e.event_status) && new Date(e.ends_at ?? e.starts_at).getTime() >= now);
}

export async function getPastEvents(): Promise<CmsEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const now = Date.now();
  return (await getEvents())
    .filter((e) => e.event_status === "completed" || e.event_status === "cancelled" || new Date(e.ends_at ?? e.starts_at).getTime() < now)
    .reverse();
}

export async function getEvent(slug: string): Promise<CmsEvent | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return null;
  const { data: speakers } = await supabase.from("event_speakers").select("name, role_title, bio, image_url").eq("event_id", data.id).order("position");
  return { ...(data as CmsEvent), speakers: speakers ?? [] };
}

// ---------------- projects / resources / stories ----------------
export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("projects");
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient().from("projects").select("*").eq("status", "published").order("published_at", { ascending: false });
  logReadError("projects", error);
  return (data as Project[]) ?? [];
}

export async function getProject(slug: string): Promise<Project | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("projects", "partners");
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();
  const { data } = await supabase.from("projects").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return null;
  const { data: links } = await supabase.from("project_partners").select("partner:partners(id, name, logo_url, website, description)").eq("project_id", data.id);
  const partners = ((links ?? []) as unknown as { partner: Partner | null }[]).map((l) => l.partner).filter(Boolean) as Partner[];
  return { ...(data as Project), partners };
}

export async function getResources(): Promise<Resource[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("resources");
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient().from("resources").select("*, category:resource_categories(name, slug)").eq("status", "published").order("published_at", { ascending: false });
  logReadError("resources", error);
  return (data as Resource[]) ?? [];
}

export async function getResource(slug: string): Promise<Resource | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("resources");
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient().from("resources").select("*, category:resource_categories(name, slug)").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as Resource) ?? null;
}

/** Entries whose title or quote is only admin guidance text (pasted by mistake) are never shown. */
const isPublicStory = (s: Story) => !isAdminGuidance(s.title) && !isAdminGuidance(s.quote);

export async function getStories(): Promise<Story[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("stories");
  if (!isSupabaseConfigured) return [];
  // RLS also requires consent_status = 'granted'.
  const { data, error } = await createPublicClient().from("stories").select("*").eq("status", "published").order("published_at", { ascending: false });
  logReadError("stories", error);
  return ((data as Story[]) ?? []).filter(isPublicStory);
}

export async function getStory(slug: string): Promise<Story | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("stories");
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient().from("stories").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data && isPublicStory(data as Story) ? (data as Story) : null;
}

// ---------------- FAQs / partners ----------------
export async function getFaqs(category: string): Promise<Faq[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("faqs");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient().from("faqs").select("id, category, question, answer").eq("category", category).eq("is_visible", true).order("position");
  return (data as Faq[]) ?? [];
}

export async function getPartnerLogos(): Promise<Partner[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("partners");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient().from("partners").select("id, name, logo_url, website, description").eq("is_visible", true).order("position");
  return (data as Partner[]) ?? [];
}

/** Picks grid items: featured, latest, or hand-picked (in the editor's order). */
export function pickItems<T extends { id: string; is_featured?: boolean }>(all: T[], mode: unknown, ids: unknown, limit: unknown): T[] {
  const n = Math.min(12, Math.max(1, Number(limit) || 3));
  if (mode === "selected" && Array.isArray(ids)) {
    const byId = new Map(all.map((x) => [x.id, x]));
    return (ids as string[]).map((id) => byId.get(id)).filter(Boolean).slice(0, n) as T[];
  }
  if (mode === "featured") return all.filter((x) => x.is_featured).slice(0, n);
  return all.slice(0, n);
}
