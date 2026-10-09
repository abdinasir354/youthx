import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { pagePublicPath, type PageRecord } from "@/lib/cms/pages";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { NewPageButton } from "@/components/admin/cms/new-page-button";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  await requireAdmin("content");
  const supabase = await createClient();
  const { data } = await supabase.from("pages").select("id, slug, title, status, is_system, updated_at, page_sections(count)").order("is_system", { ascending: false }).order("title");
  const pages = (data ?? []) as unknown as (PageRecord & { page_sections: { count: number }[] })[];
  const system = pages.filter((p) => p.is_system && !p.slug.startsWith("program-"));
  const programPages = pages.filter((p) => p.slug.startsWith("program-"));
  const custom = pages.filter((p) => !p.is_system);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build every page from sections — drag to reorder, show or hide, and edit text and images.</p>
        </div>
        <NewPageButton />
      </div>
      <PageGroup title="Website pages" pages={system} />
      {programPages.length > 0 && <PageGroup title="Extra sections on program pages" pages={programPages} />}
      <PageGroup title="Custom pages" pages={custom} empty="No custom pages yet. Create one for campaigns, reports or announcements." />
    </div>
  );
}

function PageGroup({ title, pages, empty }: { title: string; pages: (PageRecord & { page_sections: { count: number }[] })[]; empty?: string }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {pages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-white px-4 py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
          {pages.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/pages/${p.id}`} className="font-semibold text-secondary hover:underline">
                  {p.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{pagePublicPath(p.slug)}</span> · {p.page_sections?.[0]?.count ?? 0} sections · updated{" "}
                  {new Date(p.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <StatusBadge status={p.status} />
              <Link href={`/admin/pages/${p.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-secondary hover:bg-muted">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
