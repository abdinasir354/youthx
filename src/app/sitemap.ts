import type { MetadataRoute } from "next";
import { getEvents, getProjects, getPrograms, getResources, getStories } from "@/lib/data/cms";
import { getPosts, getPublishedOpportunities } from "@/lib/data/public";
import { SITE_URL } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const entry = (path: string, lastModified?: string | null): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, lastModified: lastModified ?? undefined });

/** Every published page and entry. Drafts, admin and the hidden sign-in page are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["/", "/about", "/programs", "/opportunities", "/events", "/get-involved", "/contact", "/get-involved/volunteer", "/get-involved/mentor", "/get-involved/partner", "/get-involved/sponsor", "/resources", "/stories", "/blog", "/gallery", "/donate", "/privacy", "/terms", "/cookies"];
  const [programs, events, opps, projects, resources, stories, news, customPages] = await Promise.all([
    getPrograms(), getEvents(), getPublishedOpportunities(), getProjects(), getResources(), getStories(), getPosts("news", 500),
    isSupabaseConfigured
      ? createPublicClient().from("pages").select("slug, updated_at").eq("status", "published").eq("is_system", false).then((r) => r.data ?? [])
      : Promise.resolve([] as { slug: string; updated_at: string }[]),
  ]);
  return [
    ...statics.map((p) => entry(p)),
    ...customPages.map((p) => entry(`/${p.slug}`, p.updated_at)),
    ...programs.map((p) => entry(`/programs/${p.slug}`, p.updated_at)),
    ...events.map((e) => entry(`/events/${e.slug}`, e.updated_at)),
    ...opps.map((o) => entry(`/opportunities/${o.slug}`, o.updated_at ?? o.created_at)),
    ...projects.map((p) => entry(`/projects/${p.slug}`, p.updated_at)),
    ...resources.map((r) => entry(`/resources/${r.slug}`, r.updated_at)),
    ...stories.map((s) => entry(`/stories/${s.slug}`, s.updated_at)),
    ...news.map((p) => entry(`/blog/${p.slug}`, p.published_at ?? p.created_at)),
  ];
}
