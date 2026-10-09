"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeft, BarChart3, ChevronDown, CircleHelp, Copy, Eye, EyeOff, FileText, Handshake, Image as ImageIcon, Images,
  LayoutGrid, Loader2, Megaphone, PanelTop, Plus, Save, Send, Text, Trash2, Undo2, Video,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import {
  addSection, deletePage, deleteSection, duplicateSection, reorderSections, savePageSettings, saveSection,
  setPageStatus, setSectionVisible, type SectionRow,
} from "@/app/actions/cms";
import type { FieldDef } from "@/lib/cms/fields";
import { LISTING_PAGES, pagePublicPath, type PageRecord } from "@/lib/cms/pages";
import { SECTION_TYPES, SECTIONS, sectionSummary, type SectionType } from "@/lib/cms/sections";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal, adminErrorText, useConfirm } from "@/components/admin/ui/feedback";
import { SortableList } from "@/components/admin/ui/sortable";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { FieldGrid, stripKeys, type RelationOptions } from "./field-renderer";

const ICONS: Record<string, LucideIcon> = {
  "panel-top": PanelTop, text: Text, image: ImageIcon, "layout-grid": LayoutGrid, megaphone: Megaphone,
  "circle-help": CircleHelp, "bar-chart-3": BarChart3, images: Images, video: Video, handshake: Handshake,
};

export function PageBuilder({ page: initialPage, sections: initialSections, relations, canPublish }: { page: PageRecord; sections: SectionRow[]; relations: RelationOptions; canPublish: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [page, setPage] = useState(initialPage);
  const [sections, setSections] = useState(initialSections);
  const [tab, setTab] = useState<"sections" | "settings">("sections");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chooser, setChooser] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ordering, startOrdering] = useTransition();
  const livePath = pagePublicPath(page.slug);

  function reorder(next: SectionRow[]) {
    const prev = sections;
    setSections(next);
    startOrdering(async () => {
      const res = await reorderSections(page.id, next.map((s) => s.id));
      if (!res.ok) {
        setSections(prev);
        toast.error(adminErrorText(res.error));
      } else toast.success("Section order saved");
    });
  }

  async function add(type: SectionType) {
    setChooser(false);
    setBusy("add");
    const res = await addSection(page.id, type, sections.length);
    setBusy(null);
    if (!res.ok || !res.data) return void toast.error(adminErrorText(res.ok ? undefined : res.error));
    setSections((s) => [...s, res.data!]);
    setExpanded(res.data.id);
    toast.success(`${SECTIONS[type].label} section added`);
    requestAnimationFrame(() => document.getElementById(`section-${res.data!.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function toggleVisible(s: SectionRow) {
    setBusy(s.id);
    const res = await setSectionVisible(s.id, !s.is_visible);
    setBusy(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    setSections((all) => all.map((x) => (x.id === s.id ? { ...x, is_visible: !s.is_visible } : x)));
    toast.success(s.is_visible ? "Section hidden" : "Section visible");
  }

  async function duplicate(s: SectionRow) {
    setBusy(s.id);
    const res = await duplicateSection(s.id);
    setBusy(null);
    if (!res.ok || !res.data) return void toast.error(adminErrorText(res.ok ? undefined : res.error));
    const i = sections.findIndex((x) => x.id === s.id);
    const next = [...sections.slice(0, i + 1), res.data, ...sections.slice(i + 1)];
    setSections(next);
    await reorderSections(page.id, next.map((x) => x.id));
    toast.success("Section duplicated");
  }

  async function remove(s: SectionRow) {
    const ok = await confirm({ title: `Delete this ${SECTIONS[s.type].label.toLowerCase()} section?`, body: "Its content will be lost. This can't be undone.", confirmLabel: "Delete section", danger: true });
    if (!ok) return;
    setBusy(s.id);
    const res = await deleteSection(s.id);
    setBusy(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    setSections((all) => all.filter((x) => x.id !== s.id));
    toast.success("Section deleted");
  }

  async function changeStatus(status: "draft" | "published") {
    setBusy("status");
    const res = await setPageStatus(page.id, status);
    setBusy(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    setPage((p) => ({ ...p, status }));
    toast.success(status === "published" ? "Page published" : "Page unpublished");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href="/admin/pages" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-secondary">
            <ArrowLeft className="size-4" /> Pages
          </Link>
          <h1 className="truncate text-2xl font-bold text-secondary">{page.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={page.status} />
            <span className="font-mono">{livePath}</span>
            {page.is_system && <span className="rounded bg-muted px-1.5 py-0.5">Built-in page</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/preview/page/${page.id}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-secondary hover:bg-muted">
            <Eye className="size-4" /> Preview
          </a>
          {page.status === "published" && (
            <a href={livePath} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-secondary hover:bg-muted">
              View live
            </a>
          )}
          {page.status === "published" ? (
            <Button variant="outline" disabled={busy === "status"} onClick={() => void changeStatus("draft")}>
              <Undo2 /> Unpublish
            </Button>
          ) : (
            canPublish && (
              <Button variant="secondary" disabled={busy === "status"} onClick={() => void changeStatus("published")}>
                {busy === "status" ? <Loader2 className="animate-spin" /> : <Send />} Publish page
              </Button>
            )
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Page editor" className="mb-5 flex gap-1 border-b border-border">
        {(["sections", "settings"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t ? "border-secondary text-secondary" : "border-transparent text-muted-foreground hover:text-secondary")}
          >
            {t === "sections" ? `Sections (${sections.length})` : "Page settings & SEO"}
          </button>
        ))}
      </div>

      {tab === "sections" ? (
        <div className="space-y-3">
          {LISTING_PAGES[page.slug] && (
            <div className="rounded-md border border-secondary/15 bg-secondary-soft px-4 py-3 text-sm text-secondary">{LISTING_PAGES[page.slug]}</div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Drag sections by the handle to reorder. Changes to a section are saved with its Save button.</span>
            {ordering && (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving order…
              </span>
            )}
          </div>

          {sections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center">
              <FileText className="mx-auto size-8 text-secondary/40" aria-hidden />
              <p className="mt-2 font-semibold text-secondary">This page has no sections yet</p>
              <p className="text-sm text-muted-foreground">Add a hero, text, cards, a grid of programs, and more.</p>
            </div>
          ) : (
            <SortableList
              items={sections}
              getId={(s) => s.id}
              onReorder={reorder}
              className="space-y-3"
              renderItem={(s, handle, i) => (
                <SectionCard
                  key={s.id}
                  section={s}
                  index={i}
                  handle={handle}
                  open={expanded === s.id}
                  busy={busy === s.id}
                  relations={relations}
                  onToggleOpen={() => setExpanded((e) => (e === s.id ? null : s.id))}
                  onToggleVisible={() => void toggleVisible(s)}
                  onDuplicate={() => void duplicate(s)}
                  onDelete={() => void remove(s)}
                  onSaved={(data, anchor) => setSections((all) => all.map((x) => (x.id === s.id ? { ...x, data, anchor } : x)))}
                />
              )}
            />
          )}

          <button
            type="button"
            onClick={() => setChooser(true)}
            disabled={busy === "add"}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-white py-5 text-sm font-semibold text-secondary hover:border-secondary/40 hover:bg-muted/40"
          >
            {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add section
          </button>

          <Modal open={chooser} onClose={() => setChooser(false)} title="Add a section" wide>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_TYPES.map((t) => {
                const d = SECTIONS[t];
                const Icon = ICONS[d.icon] ?? LayoutGrid;
                return (
                  <button key={t} type="button" onClick={() => void add(t)} className="flex items-start gap-3 rounded-md border border-border bg-white p-3 text-left hover:border-secondary hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-secondary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-secondary">{d.label}</span>
                      <span className="block text-xs text-muted-foreground">{d.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Modal>
        </div>
      ) : (
        <PageSettings
          page={page}
          onSaved={(p) => setPage((x) => ({ ...x, ...p }))}
          onDelete={async () => {
            const ok = await confirm({ title: "Delete this page?", body: "The page and all its sections will be removed. This can't be undone.", confirmLabel: "Delete page", danger: true });
            if (!ok) return;
            const res = await deletePage(page.id);
            if (!res.ok) return void toast.error(adminErrorText(res.error));
            toast.success("Page deleted");
            router.push("/admin/pages");
          }}
        />
      )}
    </div>
  );
}

function SectionCard({
  section,
  index,
  handle,
  open,
  busy,
  relations,
  onToggleOpen,
  onToggleVisible,
  onDuplicate,
  onDelete,
  onSaved,
}: {
  section: SectionRow;
  index: number;
  handle: React.ReactNode;
  open: boolean;
  busy: boolean;
  relations: RelationOptions;
  onToggleOpen: () => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSaved: (data: Record<string, unknown>, anchor: string | null) => void;
}) {
  const def = SECTIONS[section.type];
  const Icon = ICONS[def.icon] ?? LayoutGrid;
  const initial = useMemo(() => withDefaults(def.fields, section.data), [def.fields, section.data]);
  const [values, setValues] = useState(initial);
  const [anchor, setAnchor] = useState(section.anchor ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || anchor !== (section.anchor ?? "");

  function save() {
    startSaving(async () => {
      const res = await saveSection(section.id, { data: stripKeys(values), anchor });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return void toast.error(adminErrorText(res.error));
      }
      setErrors({});
      onSaved(res.data ?? {}, anchor || null);
      toast.success("Section saved");
    });
  }

  return (
    <div id={`section-${section.id}`} className={cn("rounded-lg border bg-white", open ? "border-secondary/40 shadow-sm" : "border-border", !section.is_visible && "opacity-70")}>
      <div className="flex items-center gap-1 p-2">
        {handle}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-secondary">
          <Icon className="size-4" aria-hidden />
        </span>
        <button type="button" onClick={onToggleOpen} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted">
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {index + 1}. {def.label}
              {!section.is_visible && " · hidden"}
              {dirty && " · unsaved"}
            </span>
            <span className="block truncate text-sm font-medium text-secondary">{sectionSummary(section.type, values)}</span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden />
        </button>
        <button type="button" onClick={onToggleVisible} disabled={busy} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-secondary" aria-label={section.is_visible ? "Hide section" : "Show section"} title={section.is_visible ? "Visible — click to hide" : "Hidden — click to show"}>
          {section.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
        <button type="button" onClick={onDuplicate} disabled={busy} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-secondary" aria-label="Duplicate section" title="Duplicate">
          <Copy className="size-4" />
        </button>
        <button type="button" onClick={onDelete} disabled={busy} className="rounded-md p-2 text-danger hover:bg-danger-soft" aria-label="Delete section" title="Delete">
          <Trash2 className="size-4" />
        </button>
      </div>
      {open && (
        <div className="border-t border-border p-5">
          <FieldGrid fields={def.fields} ctx={{ values, errors, relations }} onChange={(name, v) => setValues((x) => ({ ...x, [name]: v }))} />
          <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="max-w-xs">
              <Label htmlFor={`anchor-${section.id}`}>Anchor (optional)</Label>
              <Input id={`anchor-${section.id}`} value={anchor} onChange={(e) => setAnchor(e.target.value.toLowerCase())} placeholder="e.g. mission" className="h-10 font-mono text-xs" />
              <p className="mt-1 text-xs text-muted-foreground">Link straight to this section with #{anchor || "anchor"}.</p>
              {errors.anchor && <p className="mt-1 text-xs text-danger">{errors.anchor}</p>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={() => { setValues(initial); setAnchor(section.anchor ?? ""); setErrors({}); }}>
                Discard
              </Button>
              <Button type="button" variant="secondary" disabled={!dirty || saving} onClick={save}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />} Save section
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Fill in missing keys so every field has a value of the right shape. */
function withDefaults(fields: FieldDef[], data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = data[f.name];
    if (v === undefined || v === null) {
      out[f.name] = ["repeater", "relation_multi", "gallery", "list", "tags", "documents"].includes(f.kind) ? [] : f.kind === "boolean" ? false : f.kind === "link" ? { label: "", href: "" } : "";
    } else out[f.name] = typeof v === "number" ? String(v) : v;
  }
  return out;
}

function PageSettings({ page, onSaved, onDelete }: { page: PageRecord; onSaved: (p: Partial<PageRecord>) => void; onDelete: () => void }) {
  const [values, setValues] = useState<Record<string, unknown>>({
    title: page.title,
    slug: page.slug,
    description: page.description ?? "",
    seo_title: page.seo_title ?? "",
    seo_description: page.seo_description ?? "",
    og_image_url: page.og_image_url ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const fields: FieldDef[] = [
    { kind: "text", name: "title", label: "Page title", required: true, max: 160 },
    ...(page.is_system ? [] : [{ kind: "slug", name: "slug", label: "URL slug", from: "title", required: true } as FieldDef]),
    { kind: "textarea", name: "description", label: "Introduction (shown under the title)", max: 600, rows: 3 },
    { kind: "text", name: "seo_title", label: "SEO title", max: 70, help: "Leave empty to use the page title." },
    { kind: "textarea", name: "seo_description", label: "SEO description", max: 170, rows: 3, help: "About 150 characters for search results and link previews." },
    { kind: "image", name: "og_image_url", label: "Social sharing image", folder: "images", help: "Shown when the page is shared on WhatsApp, Facebook, X… (1200×630 works best)." },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-lg border border-border bg-white p-5">
        <FieldGrid fields={fields} ctx={{ values, errors, relations: {} }} onChange={(n, v) => setValues((x) => ({ ...x, [n]: v }))} />
        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await savePageSettings(page.id, values);
                if (!res.ok) {
                  setErrors(res.fieldErrors ?? {});
                  return void toast.error(adminErrorText(res.error));
                }
                setErrors({});
                onSaved({ title: String(values.title), slug: String(values.slug), description: String(values.description) || null, seo_title: String(values.seo_title) || null, seo_description: String(values.seo_description) || null, og_image_url: String(values.og_image_url) || null });
                toast.success("Page settings saved");
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
          </Button>
        </div>
      </section>
      {!page.is_system && (
        <aside>
          <section className="rounded-lg border border-danger/20 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold text-danger">Danger zone</h2>
            <Button variant="ghost" size="sm" className="w-full justify-start text-danger hover:bg-danger-soft" onClick={onDelete}>
              <Trash2 /> Delete page
            </Button>
          </section>
        </aside>
      )}
    </div>
  );
}
