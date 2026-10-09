import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { serviceRoleKey } from "@/lib/supabase/admin";

/** Content cache tags that may be refreshed from outside (scripts, database tools). */
const ALLOWED = new Set(["pages", "navigation", "settings", "programs", "events", "opportunities", "projects", "resources", "stories", "faqs", "partners", "stats", "seats", "courses", "posts"]);

/**
 * POST { "tags": ["pages"] } with `Authorization: Bearer <service role key>`.
 * Used after editing content directly in the database (the admin refreshes on its own).
 */
export async function POST(request: NextRequest) {
  const secret = serviceRoleKey();
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED.has(t)) : [];
  if (!tags.length) return NextResponse.json({ error: "No valid tags" }, { status: 400 });
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags });
}
