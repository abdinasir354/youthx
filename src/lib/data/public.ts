import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logReadError } from "@/lib/supabase/db-error";
import type { Course, ImpactStats, Lesson, Opportunity, Organization, Post, PublicMentor, SeatInfo } from "@/types/database.types";

/**
 * Public, cached reads. These use the cookie-less anon client, so RLS only returns
 * published rows — they can be prerendered and shared between all visitors.
 * Mutations call updateTag()/revalidateTag() with the tags below.
 */

const OPP_COLUMNS =
  "id, organization_id, organization_name, type, title, slug, summary, description, requirements, region, location, is_remote, apply_mode, application_url, attachment_url, capacity, female_ratio, min_age, max_age, apply_deadline, expires_at, starts_at, ends_at, cover_url, questions, status, is_featured, published_at, seo_title, seo_description, created_at, updated_at, organization:organizations(id, name, slug, logo_url)";

export async function getImpactStats(): Promise<ImpactStats | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("stats");
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient().rpc("impact_stats");
  return (data as ImpactStats) ?? null;
}

export async function getPublishedOpportunities(): Promise<Opportunity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("opportunities");
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("opportunities")
    .select(OPP_COLUMNS)
    .eq("status", "published")
    .order("apply_deadline", { ascending: true, nullsFirst: false })
    .limit(200);
  logReadError("opportunities", error);
  return (data as unknown as Opportunity[]) ?? [];
}

export async function getOpportunityBySlug(slug: string): Promise<Opportunity | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("opportunities", `opportunity:${slug}`);
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient().from("opportunities").select(OPP_COLUMNS).eq("slug", slug).maybeSingle();
  return (data as unknown as Opportunity) ?? null;
}

/** Published listings whose deadline / expiry hasn't passed (computed inside the cache, refreshed every few minutes). */
export async function getOpenOpportunities(): Promise<Opportunity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("opportunities");
  const now = Date.now();
  return (await getPublishedOpportunities()).filter((o) => {
    const end = o.expires_at ?? o.apply_deadline;
    return !end || new Date(end).getTime() >= now;
  });
}

/** Seat counts: invalidated with updateTag("seats") on every apply / accept / withdraw. */
export async function getSeats(ids: string[]): Promise<Record<string, SeatInfo>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("seats");
  if (!isSupabaseConfigured || ids.length === 0) return {};
  const { data } = await createPublicClient().rpc("public_seats_many", { opps: ids });
  const map: Record<string, SeatInfo> = {};
  for (const row of (data as SeatInfo[]) ?? []) map[row.opportunity_id!] = row;
  return map;
}

export async function getPublishedCourses(): Promise<(Course & { lessons: { count: number }[] })[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("courses");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient()
    .from("courses")
    .select("*, lessons(count)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  return (data as (Course & { lessons: { count: number }[] })[]) ?? [];
}

export async function getCourseBySlug(slug: string): Promise<(Course & { lessons: Lesson[] }) | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("courses", `course:${slug}`);
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient()
    .from("courses")
    .select("*, lessons(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return null;
  const course = data as Course & { lessons: Lesson[] };
  course.lessons.sort((a, b) => a.position - b.position);
  return course;
}

export async function getPosts(kind: "news" | "story", limit = 30): Promise<Post[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient()
    .from("posts")
    .select("id, kind, title, slug, excerpt, cover_url, language, is_published, published_at, created_at")
    .eq("kind", kind)
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as Post[]) ?? [];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", `post:${slug}`);
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient().from("posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return (data as Post) ?? null;
}

export async function getVerifiedPartners(): Promise<Organization[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("organizations");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient()
    .from("organizations")
    .select("id, name, slug, type, logo_url, website, description, is_verified, created_by, created_at")
    .eq("is_verified", true)
    .order("name");
  return (data as Organization[]) ?? [];
}

export async function getMentors(): Promise<PublicMentor[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("mentors");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient().from("public_mentors").select("*").order("full_name");
  return (data as PublicMentor[]) ?? [];
}
