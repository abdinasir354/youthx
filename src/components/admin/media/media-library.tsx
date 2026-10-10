"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, FileText, Loader2, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteMedia, listMedia, updateMediaAlt } from "@/app/actions/media";
import { ANY_ACCEPT, DOCUMENT_ACCEPT, IMAGE_ACCEPT, MEDIA_FOLDERS, formatBytes, isImageMime, type MediaFolder, type MediaItem, type MediaKind } from "@/lib/cms/media";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { adminErrorText, useConfirm } from "@/components/admin/ui/feedback";
import { cn } from "@/lib/utils";
import { DropZone } from "./drop-zone";
import { uploadOne } from "./upload";

type Upload = { key: string; name: string; status: "uploading" | "done" | "error"; error?: string };

export function MediaLibrary({
  mode = "manage",
  kind,
  folder: uploadFolder = "images",
  multiple = false,
  canDelete = false,
  onPick,
}: {
  mode?: "manage" | "pick";
  kind?: MediaKind;
  folder?: MediaFolder;
  multiple?: boolean;
  canDelete?: boolean;
  onPick?: (items: MediaItem[]) => void;
}) {
  const confirm = useConfirm();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<"" | MediaFolder>("");
  const [kindFilter, setKindFilter] = useState<"all" | MediaKind>(kind ?? "all");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [active, setActive] = useState<MediaItem | null>(null);
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const request = useRef(0);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++request.current;
      setLoading(true);
      const res = await listMedia({ q, folder, kind: kindFilter, page: nextPage });
      if (id !== request.current) return; // a newer search started
      setLoading(false);
      if (!res.ok || !res.data) return void toast.error(adminErrorText(res.ok ? undefined : res.error));
      const data = res.data;
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setPage(nextPage);
    },
    [q, folder, kindFilter],
  );

  // Debounced search / filter
  useEffect(() => {
    const t = setTimeout(() => void load(1, false), 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleFiles(files: File[]) {
    const queue = files.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, status: "uploading" as const }));
    setUploads((u) => [...queue, ...u]);
    let added = 0;
    for (const [i, file] of files.entries()) {
      const res = await uploadOne(file, uploadFolder, kind);
      setUploads((u) => u.map((x) => (x.key === queue[i].key ? { ...x, status: res.ok ? "done" : "error", error: res.ok ? undefined : res.error } : x)));
      if (res.ok) {
        added++;
        setItems((prev) => [res.item, ...prev]);
        setTotal((t) => t + 1);
        if (mode === "pick") setSelected((s) => (multiple ? [...s, res.item] : [res.item]));
      }
    }
    if (added) toast.success(added === 1 ? "File uploaded" : `${added} files uploaded`);
    // Clear finished rows after a moment; keep errors visible.
    setTimeout(() => setUploads((u) => u.filter((x) => x.status !== "done")), 2500);
  }

  function toggle(item: MediaItem) {
    if (mode === "manage") return setActive(item);
    setSelected((s) => {
      const has = s.some((x) => x.id === item.id);
      if (!multiple) return has ? [] : [item];
      return has ? s.filter((x) => x.id !== item.id) : [...s, item];
    });
  }

  async function remove(item: MediaItem) {
    const ok = await confirm({
      title: "Delete this file?",
      body: "It will be removed from the library and from any page that still uses it. This can't be undone.",
      confirmLabel: "Delete file",
      danger: true,
    });
    if (!ok) return;
    const res = await deleteMedia(item.id);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    setTotal((t) => t - 1);
    setActive(null);
    toast.success("File deleted");
  }

  const accept = kind === "image" ? IMAGE_ACCEPT : kind === "document" ? DOCUMENT_ACCEPT : ANY_ACCEPT;

  return (
    <div className="space-y-4">
      <DropZone
        onFiles={handleFiles}
        accept={accept}
        multiple
        compact={mode === "pick"}
        label={kind === "image" ? "Drag & drop images here" : "Drag & drop files here"}
        hint={kind === "document" ? "PDF, DOCX, XLSX, PPTX · up to 20 MB" : kind === "image" ? "JPG, PNG, WebP, AVIF · up to 10 MB" : "Images up to 10 MB · PDF and Office documents up to 20 MB"}
      />

      {uploads.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.key} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-sm", u.status === "error" ? "border-danger/30 bg-danger-soft" : "border-border bg-white")}>
              {u.status === "uploading" && <Loader2 className="size-4 animate-spin text-secondary" aria-hidden />}
              {u.status === "done" && <Check className="size-4 text-secondary" aria-hidden />}
              {u.status === "error" && <X className="size-4 text-danger" aria-hidden />}
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              <span className={cn("shrink-0 text-xs", u.status === "error" ? "text-danger" : "text-muted-foreground")}>
                {u.status === "uploading" ? "Uploading…" : u.status === "done" ? "Uploaded" : u.error}
              </span>
              {u.status === "error" && (
                <button type="button" className="text-xs text-muted-foreground hover:text-secondary" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>
                  Dismiss
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by file name or description" className="h-10 pl-9" aria-label="Search media" />
        </div>
        <Select value={folder} onChange={(e) => setFolder(e.target.value as "" | MediaFolder)} className="h-10 w-40" aria-label="Folder">
          <option value="">All folders</option>
          {MEDIA_FOLDERS.map((f) => (
            <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>
          ))}
        </Select>
        {!kind && (
          <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as "all" | MediaKind)} className="h-10 w-36" aria-label="File type">
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
          </Select>
        )}
      </div>

      <div className={cn("grid gap-4", active && mode === "manage" ? "lg:grid-cols-[1fr_20rem]" : "")}>
        <div>
          {items.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
              {q || folder ? "No files match your search." : "No files yet — drag some in above."}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" aria-label="Media files">
              {items.map((item) => {
                const isSelected = selected.some((s) => s.id === item.id) || active?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      aria-pressed={isSelected}
                      className={cn(
                        "group block w-full overflow-hidden rounded-md border bg-white text-left transition-shadow focus-visible:outline-2 focus-visible:outline-primary",
                        isSelected ? "border-secondary ring-2 ring-primary" : "border-border hover:shadow-md",
                      )}
                    >
                      <div className="relative aspect-square bg-muted">
                        {isImageMime(item.mime_type) ? (
                          <Image src={item.url} alt={item.alt_text ?? ""} fill sizes="200px" className="object-cover" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 text-secondary/70">
                            <FileText className="size-8" aria-hidden />
                            <span className="text-xs font-semibold uppercase">{item.filename.split(".").pop()}</span>
                          </div>
                        )}
                        {isSelected && mode === "pick" && (
                          <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-secondary text-white">
                            <Check className="size-3.5" aria-hidden />
                          </span>
                        )}
                      </div>
                      <p className="truncate px-2 py-1.5 text-xs text-secondary">{item.filename}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {loading && (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
            </p>
          )}
          {!loading && items.length < total && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => void load(page + 1, true)}>
                Load more ({total - items.length} remaining)
              </Button>
            </div>
          )}
        </div>

        {active && mode === "manage" && (
          <MediaDetails key={active.id} item={active} canDelete={canDelete} onClose={() => setActive(null)} onDelete={() => remove(active)} onSaved={(alt) => setItems((prev) => prev.map((x) => (x.id === active.id ? { ...x, alt_text: alt } : x)))} />
        )}
      </div>

      {mode === "pick" && (
        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-3">
          <p className="text-sm text-muted-foreground">{selected.length ? `${selected.length} selected` : multiple ? "Select one or more files" : "Select a file"}</p>
          <Button variant="secondary" size="sm" disabled={!selected.length} onClick={() => onPick?.(selected)}>
            {multiple ? "Add selected" : "Use this file"}
          </Button>
        </div>
      )}
    </div>
  );
}

function MediaDetails({ item, canDelete, onClose, onDelete, onSaved }: { item: MediaItem; canDelete: boolean; onClose: () => void; onDelete: () => void; onSaved: (alt: string | null) => void }) {
  const [alt, setAlt] = useState(item.alt_text ?? "");
  const [saving, setSaving] = useState(false);
  const image = isImageMime(item.mime_type);
  return (
    <aside className="h-fit rounded-lg border border-border bg-white lg:sticky lg:top-20" aria-label="File details">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-bold text-secondary">File details</h3>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Close details">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-4 p-4">
        {image && (
          <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
            <Image src={item.url} alt={alt} fill sizes="320px" className="object-contain" />
          </div>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="truncate text-secondary">{item.filename}</dd>
          <dt className="text-muted-foreground">Size</dt>
          <dd className="text-secondary">{formatBytes(item.size_bytes)}</dd>
          {item.width && (
            <>
              <dt className="text-muted-foreground">Dimensions</dt>
              <dd className="text-secondary">{item.width} × {item.height}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Folder</dt>
          <dd className="text-secondary">{item.folder}</dd>
          <dt className="text-muted-foreground">Uploaded</dt>
          <dd className="text-secondary">{new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd>
        </dl>
        {image && (
          <div>
            <Label htmlFor="media-alt">Description (alt text)</Label>
            <Input id="media-alt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} placeholder="Describe the image for screen readers" />
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={saving || alt === (item.alt_text ?? "")}
              onClick={async () => {
                setSaving(true);
                const res = await updateMediaAlt(item.id, alt);
                setSaving(false);
                if (!res.ok) return void toast.error(adminErrorText(res.error));
                onSaved(alt.trim() || null);
                toast.success("Description saved");
              }}
            >
              {saving && <Loader2 className="animate-spin" />}Save description
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(item.url);
              toast.success("Link copied");
            }}
          >
            <Copy /> Copy link
          </Button>
          <a href={item.url} target="_blank" rel="noopener" className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold text-secondary hover:bg-muted">
            Open
          </a>
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={onDelete}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
