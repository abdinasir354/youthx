import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { COLLECTIONS, COLLECTION_KEYS } from "@/lib/cms/collections";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "All content" };

export default async function ContentHubPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const defs = COLLECTION_KEYS.map((k) => COLLECTIONS[k]).filter((d) => can(me.adminRole, d.perm));
  const stats = await Promise.all(
    defs.map(async (d) => {
      const total = (await supabase.from(d.table).select("id", { count: "exact", head: true })).count ?? 0;
      const published = d.statusSet === "none" ? null : ((await supabase.from(d.table).select("id", { count: "exact", head: true }).eq("status", "published")).count ?? 0);
      return { total, published };
    }),
  );
  const extra = [
    can(me.adminRole, "content") && { href: "/admin/pages", label: "Pages", description: "Home, About, Get Involved and every other page — built from sections." },
    can(me.adminRole, "content") && { href: "/admin/posts", label: "News", description: "News articles and announcements." },
    can(me.adminRole, "media") && { href: "/admin/media", label: "Media library", description: "Images and documents used across the site." },
  ].filter(Boolean) as { href: string; label: string; description: string }[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">All content</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything on the website is managed here. Nothing is public until it&rsquo;s published.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {extra.map((e) => (
          <Link key={e.href} href={e.href} className="group rounded-lg border border-border bg-white p-4 hover:shadow-md">
            <p className="flex items-center justify-between font-semibold text-secondary">
              {e.label} <ArrowRight className="size-4 text-muted-foreground group-hover:text-secondary" />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>
          </Link>
        ))}
        {defs.map((d, i) => (
          <Link key={d.key} href={`/admin/${d.key}`} className="group rounded-lg border border-border bg-white p-4 hover:shadow-md">
            <p className="flex items-center justify-between font-semibold text-secondary">
              {d.label} <ArrowRight className="size-4 text-muted-foreground group-hover:text-secondary" />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-secondary">{stats[i].total}</span> total
              {stats[i].published != null && (
                <>
                  {" · "}
                  <span className="font-semibold text-secondary">{stats[i].published}</span> published
                </>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
