import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCollection, statusesFor } from "@/lib/cms/collections";
import { canPublish } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollectionTable, type ListRow } from "@/components/admin/cms/collection-table";
import { ExpireButton } from "@/components/admin/cms/expire-button";

const PAGE_SIZE = 25;

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/[collection]">): Promise<Metadata> {
  const { collection } = await params;
  return { title: getCollection(collection)?.label ?? "Content" };
}

export default async function CollectionListPage({ params, searchParams }: PageProps<"/[locale]/admin/[collection]">) {
  const { collection } = await params;
  const def = getCollection(collection);
  if (!def) notFound();
  const me = await requireAdmin(def.perm);
  const sp = (await searchParams) as { q?: string; status?: string; page?: string };
  const statuses = statusesFor(def.statusSet);
  const status = sp.status && statuses.includes(sp.status) ? sp.status : "";
  const q = (sp.q ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const filtered = Boolean(q || status);
  // Drag-and-drop ordering shows the whole list; filters/search switch to normal paging.
  const dragMode = def.sortable && !filtered;

  const supabase = await createClient();
  const cols = new Set(["id", def.titleField, ...def.columns.map((c) => c.name)]);
  if (def.statusSet !== "none") cols.add("status");
  if (def.featurable) cols.add("is_featured");
  if (def.visibility) cols.add("is_visible");
  if (def.fields.some((f) => f.kind === "slug")) cols.add("slug");
  if (def.table !== "program_categories" && def.table !== "resource_categories") cols.add("updated_at");

  let query = supabase.from(def.table).select([...cols].join(", "), { count: "exact" }).order(def.orderBy.column, { ascending: def.orderBy.ascending });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(def.searchColumns.map((c) => `${c}.ilike.%${q}%`).join(","));
  query = dragMode ? query.limit(500) : query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data, count } = await query;
  const rows = (data ?? []) as unknown as ListRow[];
  const total = count ?? 0;

  // Status tab counts
  const counts: Record<string, number> = {};
  if (statuses.length) {
    const results = await Promise.all(statuses.map((s) => supabase.from(def.table).select("id", { count: "exact", head: true }).eq("status", s)));
    statuses.forEach((s, i) => (counts[s] = results[i].count ?? 0));
  }
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q, status, ...p };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, String(v));
    const s = u.toString();
    return `/admin/${def.key}${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">{def.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{def.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {def.key === "opportunities" && <ExpireButton />}
          <Link href={`/admin/${def.key}/new`} className={buttonVariants({ variant: "secondary" })}>
            <Plus /> New {def.singular.toLowerCase()}
          </Link>
        </div>
      </div>

      {statuses.length > 0 && (
        <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border" aria-label="Filter by status">
          {["", ...statuses].map((s) => (
            <Link
              key={s || "all"}
              href={href({ status: s, page: undefined })}
              aria-current={status === s ? "page" : undefined}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
                status === s ? "border-secondary text-secondary" : "border-transparent text-muted-foreground hover:text-secondary",
              )}
            >
              {s ? s.replace("_", " ").replace(/^./, (c) => c.toUpperCase()) : "All"}
              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs">{s ? counts[s] : all}</span>
            </Link>
          ))}
        </nav>
      )}

      <form className="mb-4 flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder={`Search ${def.label.toLowerCase()}`} className="h-10 pl-9" aria-label={`Search ${def.label.toLowerCase()}`} />
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline", className: "h-10" })}>Search</button>
        {filtered && (
          <Link href={`/admin/${def.key}`} className={buttonVariants({ variant: "ghost", className: "h-10" })}>
            Clear
          </Link>
        )}
      </form>

      {def.sortable && filtered && <p className="mb-3 text-xs text-muted-foreground">Clear the search and filters to reorder by dragging.</p>}

      <CollectionTable collection={def.key} rows={rows} sortable={dragMode} canPublish={canPublish(me.adminRole)} emptyText={filtered ? "Nothing matches your search." : `No ${def.label.toLowerCase()} yet.`} />

      {!dragMode && pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground">
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link>}
            {page < pages && <Link href={href({ page: page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
