import type { MetadataRoute } from "next";
import { getPosts, getPublishedCourses, getPublishedOpportunities } from "@/lib/data/public";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Somali is served without a prefix, English under /en. */
function entry(path: string, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${base}${path}`,
    lastModified,
    alternates: { languages: { so: `${base}${path}`, en: `${base}/en${path === "/" ? "" : path}` } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [opps, courses, news, stories] = await Promise.all([getPublishedOpportunities(), getPublishedCourses(), getPosts("news", 200), getPosts("story", 200)]);
  const statics = ["/", "/about", "/programs", "/opportunities", "/courses", "/stories", "/news", "/partners", "/donate", "/contact"];
  return [
    ...statics.map((p) => entry(p)),
    ...opps.map((o) => entry(`/opportunities/${o.slug}`, o.created_at)),
    ...courses.map((c) => entry(`/courses/${c.slug}`, c.created_at)),
    ...[...news, ...stories].map((p) => entry(`/news/${p.slug}`, p.published_at ?? p.created_at)),
  ];
}
