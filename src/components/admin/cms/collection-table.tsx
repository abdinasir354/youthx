"use client";

import { useState, useTransition } from "react";
import { Archive, ExternalLink, Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Send, Star, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteEntry, reorderEntries, setEntryFlag, setEntryStatus } from "@/app/actions/cms";
import { COLLECTIONS, type CollectionKey } from "@/lib/cms/collections";
import { cn } from "@/lib/utils";
import { adminErrorText, useConfirm } from "@/components/admin/ui/feedback";
import { SortableList } from "@/components/admin/ui/sortable";
import { StatusBadge } from "@/components/admin/ui/status-badge";

export type ListRow = Record<string, unknown> & { id: string };

function formatCell(v: unknown, format?: "date" | "datetime" | "label" | "bool") {
  if (v == null || v === "") return "—";
  if (format === "date") return new Date(String(v)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (format === "datetime") return new Date(String(v)).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Mogadishu" });
  if (format === "label") return String(v).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  if (format === "bool") return v ? "Yes" : "No";
  return String(v);
}

export function CollectionTable({ collection, rows: initial, sortable, canPublish, emptyText }: { collection: CollectionKey; rows: ListRow[]; sortable: boolean; canPublish: boolean; emptyText: string }) {
  const def = COLLECTIONS[collection];
  const router = useRouter();
  const confirm = useConfirm();
  const [rows, setRows] = useState(initial);
  const [saving, startSaving] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [synced, setSynced] = useState(initial);

  // Server data changed (navigation / refresh) → take it.
  if (initial !== synced) {
    setSynced(initial);
    setRows(initial);
  }

  function reorder(next: ListRow[]) {
    const prev = rows;
    setRows(next);
    startSaving(async () => {
      const res = await reorderEntries(collection, next.map((r) => r.id));
      if (!res.ok) {
        setRows(prev);
        toast.error(adminErrorText(res.error));
      } else toast.success("Order saved");
    });
  }

  async function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusyId(id);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    toast.success(success);
    router.refresh();
  }

  async function remove(row: ListRow) {
    const ok = await confirm({
      title: `Delete “${String(row[def.titleField] ?? "this item")}”?`,
      body: "It will be removed from the website and the admin. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) await run(row.id, () => deleteEntry(collection, row.id), `${def.singular} deleted`);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white px-6 py-14 text-center">
        <p className="font-semibold text-secondary">{emptyText}</p>
        <Link href={`/admin/${collection}/new`} className="mt-3 inline-block text-sm font-medium text-secondary underline underline-offset-2">
          Create the first one
        </Link>
      </div>
    );
  }

  const renderRow = (row: ListRow, handle: React.ReactNode | null) => {
    const status = row.status as string | undefined;
    const slug = row.slug as string | undefined;
    const live = def.publicPath && slug && status === "published" ? def.publicPath(slug) : null;
    const busy = busyId === row.id;
    return (
      <div className="flex items-center gap-2 border-b border-border bg-white px-3 py-2.5 last:border-b-0 sm:gap-3 sm:px-4">
        {handle}
        <div className="min-w-0 flex-1">
          <Link href={`/admin/${collection}/${row.id}`} className="block truncate font-semibold text-secondary hover:underline">
            {String(row[def.titleField] ?? "") || "(untitled)"}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {def.columns.map((c) => (
              <span key={c.name}>
                <span className="sr-only">{c.label}: </span>
                {formatCell(row[c.name], c.format)}
              </span>
            ))}
            {row.updated_at != null && !def.columns.some((c) => c.name === "updated_at") && <span>Updated {formatCell(row.updated_at, "date")}</span>}
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {status && <StatusBadge status={status} />}
          {def.visibility && <StatusBadge status={row.is_visible ? "visible" : "hidden"} />}
        </div>
        {def.featurable && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(row.id, () => setEntryFlag(collection, row.id, "is_featured", !row.is_featured), row.is_featured ? "Removed from featured" : "Featured")}
            className={cn("rounded-md p-2 hover:bg-muted", row.is_featured ? "text-warning" : "text-muted-foreground/50 hover:text-secondary")}
            aria-pressed={Boolean(row.is_featured)}
            aria-label={row.is_featured ? "Remove from featured" : "Mark as featured"}
            title={row.is_featured ? "Featured" : "Not featured"}
          >
            <Star className={cn("size-4", Boolean(row.is_featured) && "fill-current")} />
          </button>
        )}
        <RowMenu
          busy={busy}
          items={[
            { label: "Edit", icon: Pencil, href: `/admin/${collection}/${row.id}` },
            ...(live ? [{ label: "View on site", icon: ExternalLink, external: live }] : []),
            ...(status && status !== "published" && canPublish
              ? [{ label: "Publish", icon: Send, onClick: () => run(row.id, () => setEntryStatus(collection, row.id, "published"), "Published") }]
              : []),
            ...(status === "published" ? [{ label: "Unpublish (back to draft)", icon: Undo2, onClick: () => run(row.id, () => setEntryStatus(collection, row.id, "draft"), "Unpublished") }] : []),
            ...(status && status !== "archived" ? [{ label: "Archive", icon: Archive, onClick: () => run(row.id, () => setEntryStatus(collection, row.id, "archived"), "Archived") }] : []),
            ...(def.visibility
              ? [{ label: row.is_visible ? "Hide from site" : "Show on site", icon: row.is_visible ? EyeOff : Eye, onClick: () => run(row.id, () => setEntryFlag(collection, row.id, "is_visible", !row.is_visible), row.is_visible ? "Hidden" : "Visible") }]
              : []),
            { label: "Delete", icon: Trash2, danger: true, onClick: () => remove(row) },
          ]}
        />
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      {sortable && (
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          <span>Drag the handle to change the order shown on the website.</span>
          {saving && (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Saving order…
            </span>
          )}
        </div>
      )}
      {sortable ? (
        <SortableList items={rows} getId={(r) => r.id} onReorder={reorder} renderItem={(row, handle) => renderRow(row, handle)} />
      ) : (
        rows.map((row) => <div key={row.id}>{renderRow(row, null)}</div>)
      )}
    </div>
  );
}

type MenuItem = { label: string; icon: typeof Pencil; href?: string; external?: string; onClick?: () => void; danger?: boolean };

/** Small actions menu (keyboard accessible: Tab into it, Esc closes). */
function RowMenu({ items, busy }: { items: MenuItem[]; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Actions" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-secondary" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-md border border-border bg-white py-1 shadow-lg">
          {items.map((item) => {
            const cls = cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted", item.danger ? "text-danger" : "text-secondary");
            const content = (
              <>
                <item.icon className="size-4" aria-hidden /> {item.label}
              </>
            );
            if (item.href)
              return (
                <Link key={item.label} role="menuitem" href={item.href} className={cls}>
                  {content}
                </Link>
              );
            if (item.external)
              return (
                <a key={item.label} role="menuitem" href={item.external} target="_blank" rel="noopener" className={cls}>
                  {content}
                </a>
              );
            return (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                className={cls}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
