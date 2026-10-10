"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ADMIN_GUIDANCE } from "@/lib/cms/admin-text";
import { ArrowLeft, Eye, EyeOff, Loader2, Save, Send, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteEntry, saveEntry, setEntryFlag, setEntryStatus, type SaveIntent } from "@/app/actions/cms";
import { COLLECTIONS, statusesFor, type CollectionKey } from "@/lib/cms/collections";
import type { FieldDef } from "@/lib/cms/fields";
import { Button } from "@/components/ui/button";
import { adminErrorText, useConfirm } from "@/components/admin/ui/feedback";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { FieldGrid, stripKeys, type RelationOptions } from "./field-renderer";

const GROUPS: { key: NonNullable<FieldDef["group"]>; title: string; description?: string }[] = [
  { key: "main", title: "Content" },
  { key: "details", title: "Details" },
  { key: "media", title: "Images & files", description: "Drag & drop files onto any field, or pick from the media library." },
  { key: "seo", title: "Search engines (SEO)" },
];

export function EntryEditor({
  collection,
  id,
  initial,
  meta,
  relations,
  canPublish,
}: {
  collection: CollectionKey;
  id: string | null;
  initial: Record<string, unknown>;
  meta: { status: string | null; is_featured?: boolean; is_visible?: boolean; updated_at?: string | null; published_at?: string | null };
  relations: RelationOptions;
  canPublish: boolean;
}) {
  const def = COLLECTIONS[collection];
  const router = useRouter();
  const confirm = useConfirm();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState(meta.status);
  const [featured, setFeatured] = useState(Boolean(meta.is_featured));
  const [visible, setVisible] = useState(meta.is_visible ?? true);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved]);
  const titleField = def.titleField;
  const slugField = def.fields.find((f) => f.kind === "slug");

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function setField(name: string, v: unknown) {
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      // New entries: the slug follows the title until edited by hand.
      if (slugField && !slugTouched && slugField.kind === "slug" && name === slugField.from) {
        next[slugField.name] = String(v ?? "")
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80);
      }
      return next;
    });
    if (errors[name])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
  }

  function save(intent: SaveIntent) {
    start(async () => {
      const res = await saveEntry(collection, id, stripKeys(values), intent);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(adminErrorText(res.error));
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) document.getElementById(`field-${first.split(".")[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setErrors({});
      setSaved(values);
      if (intent === "publish") setStatus("published");
      else if (!id) setStatus(def.statusSet === "none" ? null : "draft");
      toast.success(intent === "publish" ? `${def.singular} published` : `${def.singular} saved`);
      if (!id && res.data) router.replace(`/admin/${collection}/${res.data.id}`);
      else router.refresh();
    });
  }

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) save("save");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function changeStatus(next: string) {
    if (!id) return;
    if (dirty && !(await confirm({ title: "You have unsaved changes", body: "Save your changes first, or they'll stay unsaved.", confirmLabel: "Change status anyway" }))) return;
    setBusy("status");
    const res = await setEntryStatus(collection, id, next);
    setBusy(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    setStatus(next);
    toast.success(`Status changed to ${next.replace("_", " ")}`);
    router.refresh();
  }

  async function toggleFlag(flag: "is_featured" | "is_visible", value: boolean) {
    if (!id) return;
    setBusy(flag);
    const res = await setEntryFlag(collection, id, flag, value);
    setBusy(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    if (flag === "is_featured") setFeatured(value);
    else setVisible(value);
    toast.success(flag === "is_featured" ? (value ? "Marked as featured" : "Removed from featured") : value ? "Now visible" : "Hidden");
  }

  async function remove() {
    if (!id) return;
    const ok = await confirm({
      title: `Delete this ${def.singular.toLowerCase()}?`,
      body: "This permanently removes it from the website and the admin. This can't be undone.",
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    setBusy("delete");
    const res = await deleteEntry(collection, id);
    setBusy(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    toast.success(`${def.singular} deleted`);
    router.push(`/admin/${collection}`);
  }

  const ctx = { values, errors, relations, autoSlug: !slugTouched, onSlugTouched: () => setSlugTouched(true) };
  const name = String(values[titleField] ?? "") || `New ${def.singular.toLowerCase()}`;
  const slug = typeof saved.slug === "string" ? saved.slug : null;
  const livePath = def.publicPath && slug && status === "published" ? def.publicPath(slug) : null;
  const statuses = statusesFor(def.statusSet);

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href={`/admin/${collection}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-secondary">
            <ArrowLeft className="size-4" /> {def.label}
          </Link>
          <h1 className="truncate text-2xl font-bold text-secondary">{name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {status && <StatusBadge status={status} />}
            {featured && <span className="inline-flex items-center gap-1 rounded bg-primary-soft px-2 py-0.5 font-semibold text-secondary"><Star className="size-3" /> Featured</span>}
            {def.visibility && !visible && <span className="rounded bg-muted px-2 py-0.5 font-semibold">Hidden</span>}
            {meta.updated_at && <span>Last saved {new Date(meta.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>}
            {dirty && <span className="font-semibold text-warning">• Unsaved changes</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {livePath && (
            <a href={livePath} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-secondary hover:bg-muted">
              <Eye className="size-4" /> View live
            </a>
          )}
          {id && def.publicPath && collection !== "opportunities" && slug && status !== "published" && (
            <a href={`/preview/${collection}/${id}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-secondary hover:bg-muted">
              <Eye className="size-4" /> Preview
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          {GROUPS.map((g) => {
            const fields = def.fields.filter((f) => (f.group ?? "main") === g.key);
            if (!fields.length) return null;
            return (
              <section key={g.key} className="rounded-lg border border-border bg-white" aria-labelledby={`grp-${g.key}`}>
                <header className="border-b border-border px-5 py-3">
                  <h2 id={`grp-${g.key}`} className="text-sm font-bold text-secondary">{g.title}</h2>
                  {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                </header>
                <div className="p-5">
                  {g.key === "seo" && <SearchPreview title={String(values.seo_title || values[titleField] || "")} description={String(values.seo_description || values.short_description || values.summary || values.description || "")} path={def.publicPath && values.slug ? def.publicPath(String(values.slug)) : null} />}
                  <div className="grid gap-5 lg:grid-cols-2">
                    {fields.map((f) => (
                      <div key={f.name} id={`field-${f.name}`} className={f.half ? "" : "lg:col-span-2"}>
                        <FieldGrid fields={[{ ...f, half: false }]} ctx={ctx} onChange={setField} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {def.statusSet !== "none" && (
            <section className="rounded-lg border border-border bg-white p-4">
              <h2 className="mb-3 text-sm font-bold text-secondary">Publishing</h2>
              {!id ? (
                <p className="text-xs text-muted-foreground">{ADMIN_GUIDANCE.draftNote}</p>
              ) : (
                <>
                  <label htmlFor="entry-status" className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    id="entry-status"
                    value={status ?? ""}
                    disabled={busy === "status"}
                    onChange={(e) => void changeStatus(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-white px-2 text-sm"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s} disabled={s === "published" && !canPublish}>
                        {s.replace("_", " ").replace(/^./, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  {meta.published_at && <p className="mt-2 text-xs text-muted-foreground">First published {new Date(meta.published_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</p>}
                </>
              )}
              {!canPublish && <p className="mt-2 rounded bg-warning-soft px-2 py-1.5 text-xs text-warning">Your role can save drafts. A Content Admin or Program Manager publishes.</p>}
            </section>
          )}

          {id && (def.featurable || def.visibility) && (
            <section className="space-y-2 rounded-lg border border-border bg-white p-4">
              <h2 className="text-sm font-bold text-secondary">Display</h2>
              {def.featurable && (
                <Button type="button" variant="outline" size="sm" className="w-full justify-start" disabled={busy === "is_featured"} onClick={() => void toggleFlag("is_featured", !featured)} aria-pressed={featured}>
                  <Star className={featured ? "fill-current" : ""} /> {featured ? "Featured — click to remove" : "Feature on the website"}
                </Button>
              )}
              {def.visibility && (
                <Button type="button" variant="outline" size="sm" className="w-full justify-start" disabled={busy === "is_visible"} onClick={() => void toggleFlag("is_visible", !visible)} aria-pressed={!visible}>
                  {visible ? <EyeOff /> : <Eye />} {visible ? "Hide from the website" : "Show on the website"}
                </Button>
              )}
            </section>
          )}

          {id && (
            <section className="rounded-lg border border-danger/20 bg-white p-4">
              <h2 className="mb-2 text-sm font-bold text-danger">Danger zone</h2>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-danger hover:bg-danger-soft" disabled={busy === "delete"} onClick={() => void remove()}>
                {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete {def.singular.toLowerCase()}
              </Button>
            </section>
          )}
        </aside>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="hidden text-xs text-muted-foreground sm:block">{dirty ? "You have unsaved changes · Ctrl+S to save" : "All changes saved"}</p>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => save("save")}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              {def.statusSet !== "none" && status !== "published" ? "Save draft" : "Save"}
            </Button>
            {def.statusSet !== "none" && canPublish && status !== "published" && (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => save("publish")}>
                <Send /> {id ? "Save & publish" : "Publish"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** How the entry might look in a Google result. */
function SearchPreview({ title, description, path }: { title: string; description: string; path: string | null }) {
  const desc = description.replace(/[#*_>\[\]()`-]/g, "").replace(/\s+/g, " ").trim();
  return (
    <div className="mb-5 rounded-md border border-border bg-muted/40 p-4" aria-label="Search result preview">
      <p className="text-xs text-muted-foreground">youthup.org{path ?? ""}</p>
      <p className="truncate text-lg text-[#1a0dab]">{title || "Title"}</p>
      <p className="line-clamp-2 text-sm text-[#4d5156]">{desc || "Add a description so search engines show a helpful summary."}</p>
    </div>
  );
}
