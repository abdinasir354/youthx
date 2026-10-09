"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Copy, Plus, Trash2, X } from "lucide-react";
import { ICON_OPTIONS, emptyValues, type FieldDef, type Option } from "@/lib/cms/fields";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { SortableList } from "@/components/admin/ui/sortable";
import { CmsIcon } from "@/components/cms/icon";
import { DocumentsField, FileField, GalleryField, ImageField } from "./media-fields";
import { RichTextEditor } from "./rich-text";

/** Options for relation fields, keyed by source table (loaded on the server). */
export type RelationOptions = Record<string, Option[]>;

export type FieldContext = {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  relations: RelationOptions;
  /** Slug fields follow their source field until edited by hand. */
  autoSlug?: boolean;
  onSlugTouched?: () => void;
};

const SPEAKER_FIELDS: FieldDef[] = [
  { kind: "text", name: "name", label: "Name", required: true, max: 120, half: true },
  { kind: "text", name: "role_title", label: "Role / organization", max: 160, half: true },
  { kind: "textarea", name: "bio", label: "Short bio", max: 2000, rows: 3 },
  { kind: "image", name: "image_url", label: "Photo", folder: "events" },
];

export function FieldLabel({ htmlFor, field, as = "label" }: { htmlFor: string; field: FieldDef; as?: "label" | "legend" }) {
  const Tag = as;
  return (
    <Tag {...(as === "label" ? { htmlFor } : {})} className="mb-1.5 block text-sm font-medium text-secondary">
      {field.label}
      {field.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      {field.required && <span className="sr-only"> (required)</span>}
    </Tag>
  );
}

/** Renders one field with its label, help text and error. `path` is the error key ("items.2.title"). */
export function Field({
  field,
  value,
  onChange,
  ctx,
  path = field.name,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  ctx: FieldContext;
  path?: string;
}) {
  const id = useId();
  const error = ctx.errors[path];
  const describedBy = error ? `${id}-err` : field.help ? `${id}-help` : undefined;
  const grouped = ["repeater", "speakers", "gallery", "documents", "relation_multi", "list", "tags", "link"].includes(field.kind);

  if (field.kind === "boolean") {
    return (
      <div className={field.half ? "lg:col-span-1" : "lg:col-span-2"}>
        <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm text-secondary">
          <Checkbox id={id} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" aria-describedby={describedBy} />
          <span>
            <span className="font-medium">{field.label}</span>
            {field.help && <span id={`${id}-help`} className="block text-xs text-muted-foreground">{field.help}</span>}
          </span>
        </label>
      </div>
    );
  }

  const Wrapper = grouped ? "fieldset" : "div";
  return (
    <Wrapper className={cn("min-w-0", field.half ? "lg:col-span-1" : "lg:col-span-2")}>
      <FieldLabel htmlFor={id} field={field} as={grouped ? "legend" : "label"} />
      <Control field={field} id={id} value={value} onChange={onChange} ctx={ctx} path={path} invalid={!!error} describedBy={describedBy} />
      {field.help && !error && <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </Wrapper>
  );
}

function Control({
  field: f,
  id,
  value,
  onChange,
  ctx,
  path,
  invalid,
  describedBy,
}: {
  field: FieldDef;
  id: string;
  value: unknown;
  onChange: (v: unknown) => void;
  ctx: FieldContext;
  path: string;
  invalid: boolean;
  describedBy?: string;
}) {
  const aria = { "aria-invalid": invalid || undefined, "aria-describedby": describedBy };
  const str = value == null ? "" : String(value);

  switch (f.kind) {
    case "text":
      return <Input id={id} value={str} onChange={(e) => onChange(e.target.value)} maxLength={f.max} placeholder={f.placeholder} {...aria} />;
    case "email":
      return <Input id={id} type="email" value={str} onChange={(e) => onChange(e.target.value)} {...aria} />;
    case "url":
      return <Input id={id} type="text" inputMode="url" value={str} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder ?? (f.allowRelative ? "https://… or /page" : "https://…")} {...aria} />;
    case "slug": {
      const source = String(ctx.values[f.from] ?? "");
      return (
        <div className="flex gap-2">
          <Input
            id={id}
            value={str}
            onChange={(e) => {
              ctx.onSlugTouched?.();
              onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-"));
            }}
            className="font-mono text-xs"
            {...aria}
          />
          <Button type="button" variant="outline" size="sm" className="h-11 shrink-0" onClick={() => onChange(slugify(source))} disabled={!source}>
            From {f.from}
          </Button>
        </div>
      );
    }
    case "textarea":
      return <Textarea id={id} value={str} onChange={(e) => onChange(e.target.value)} maxLength={f.max} rows={f.rows ?? 4} {...aria} />;
    case "richtext":
      return <RichTextEditor id={id} value={str} onChange={onChange} invalid={invalid} maxLength={f.max} />;
    case "number":
      return <Input id={id} type="number" inputMode="decimal" value={str} min={f.min} max={f.max} step={f.step ?? (f.integer ? 1 : "any")} onChange={(e) => onChange(e.target.value)} className="max-w-48" {...aria} />;
    case "date":
      return <Input id={id} type="date" value={str} onChange={(e) => onChange(e.target.value)} className="max-w-56" {...aria} />;
    case "datetime":
      return (
        <div>
          <Input id={id} type="datetime-local" value={str} onChange={(e) => onChange(e.target.value)} className="max-w-64" {...aria} />
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">Somalia time (EAT)</p>
        </div>
      );
    case "select":
      return (
        <Select id={id} value={str} onChange={(e) => onChange(e.target.value)} {...aria}>
          {(!f.required || !str) && <option value="">{f.placeholder ?? (f.required ? "Choose…" : "None")}</option>}
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      );
    case "icon":
      return <IconPicker id={id} value={str} onChange={onChange} />;
    case "relation": {
      const options = ctx.relations[f.source] ?? [];
      return (
        <Select id={id} value={str} onChange={(e) => onChange(e.target.value)} {...aria}>
          <option value="">{f.placeholder ?? "None"}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      );
    }
    case "relation_multi":
      return <RelationMulti id={id} value={(value as string[]) ?? []} onChange={onChange} options={ctx.relations[f.source] ?? []} max={f.max} />;
    case "tags":
      return <TagsInput id={id} value={(value as string[]) ?? []} onChange={onChange} max={f.max} placeholder={f.placeholder} />;
    case "list":
      return <ListInput id={id} value={(value as string[]) ?? []} onChange={onChange} max={f.max} itemLabel={f.itemLabel ?? "Item"} />;
    case "link": {
      const link = (value as { label?: string; href?: string } | null) ?? {};
      return (
        <div id={id} className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
          <Input value={link.label ?? ""} onChange={(e) => onChange({ ...link, label: e.target.value })} placeholder="Button text" aria-label={`${f.label} text`} maxLength={60} />
          <Input value={link.href ?? ""} onChange={(e) => onChange({ ...link, href: e.target.value })} placeholder="/page or https://…" aria-label={`${f.label} link`} aria-invalid={invalid || undefined} />
        </div>
      );
    }
    case "image":
      return <ImageField id={id} value={str} onChange={onChange} folder={f.folder} invalid={invalid} />;
    case "gallery":
      return <GalleryField id={id} value={(value as string[]) ?? []} onChange={onChange} folder={f.folder} max={f.max} />;
    case "file":
      return <FileField id={id} value={str} onChange={onChange} folder={f.folder} />;
    case "documents":
      return <DocumentsField id={id} value={(value as { name: string; url: string }[]) ?? []} onChange={onChange} folder={f.folder} />;
    case "repeater":
      return <Repeater value={(value as Record<string, unknown>[]) ?? []} onChange={onChange} fields={f.fields} itemLabel={f.itemLabel} titleField={f.titleField} max={f.max} ctx={ctx} path={path} />;
    case "speakers":
      return <Repeater value={(value as Record<string, unknown>[]) ?? []} onChange={onChange} fields={SPEAKER_FIELDS} itemLabel="Speaker" titleField="name" max={30} ctx={ctx} path={path} />;
  }
}

function IconPicker({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-primary-soft text-secondary">
        {value ? <CmsIcon name={value} className="size-5" /> : <span className="text-xs text-muted-foreground">—</span>}
      </span>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">No icon</option>
        {ICON_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
}

function TagsInput({ id, value, onChange, max = 30, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange([...value, ...parts.filter((p) => !value.includes(p))].slice(0, max));
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-white p-1.5 focus-within:border-secondary focus-within:ring-2 focus-within:ring-primary/60">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-secondary-soft px-2 py-1 text-xs font-medium text-secondary">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded hover:text-danger">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : (placeholder ?? "Type and press Enter")}
        className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-sm focus:outline-none"
      />
    </div>
  );
}

/** Ordered list of short texts (objectives, activities), drag to reorder. */
function ListInput({ id, value, onChange, max = 30, itemLabel }: { id: string; value: string[]; onChange: (v: string[]) => void; max?: number; itemLabel: string }) {
  // Stable keys for drag-and-drop while texts are edited.
  const [keys, setKeys] = useState(() => value.map((_, i) => `k${i}`));
  const synced = keys.length === value.length ? keys : value.map((_, i) => keys[i] ?? `x${i}`);
  const rows = value.map((text, i) => ({ key: synced[i], text }));
  const set = (next: { key: string; text: string }[]) => {
    setKeys(next.map((r) => r.key));
    onChange(next.map((r) => r.text));
  };
  return (
    <div id={id} className="space-y-2">
      <SortableList
        items={rows}
        getId={(r) => r.key}
        onReorder={set}
        className="space-y-2"
        renderItem={(row, handle, i) => (
          <div className="flex items-center gap-1.5">
            {handle}
            <Input value={row.text} onChange={(e) => set(rows.map((r, j) => (j === i ? { ...r, text: e.target.value } : r)))} className="h-10" aria-label={`${itemLabel} ${i + 1}`} maxLength={300} />
            <button type="button" onClick={() => set(rows.filter((_, j) => j !== i))} className="rounded p-2 text-danger hover:bg-danger-soft" aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      />
      <Button type="button" size="sm" variant="outline" disabled={value.length >= max} onClick={() => set([...rows, { key: `n${Date.now()}`, text: "" }])}>
        <Plus /> Add {itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

/** Pick entries from another collection; chosen items keep their order (drag to change it). */
function RelationMulti({ id, value, onChange, options, max = 50 }: { id: string; value: string[]; onChange: (v: string[]) => void; options: Option[]; max?: number }) {
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? "(unavailable)";
  const remaining = options.filter((o) => !value.includes(o.value));
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <SortableList
          items={value}
          getId={(v) => v}
          onReorder={onChange}
          className="space-y-1.5"
          renderItem={(v, handle, i) => (
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-white py-1 pl-1 pr-2 text-sm">
              {handle}
              <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-secondary">{labelOf(v)}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="rounded p-1 text-muted-foreground hover:text-danger" aria-label={`Remove ${labelOf(v)}`}>
                <X className="size-4" />
              </button>
            </div>
          )}
        />
      )}
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing to choose from yet.</p>
      ) : (
        <Select
          id={id}
          value=""
          disabled={value.length >= max || remaining.length === 0}
          onChange={(e) => e.target.value && onChange([...value, e.target.value])}
          aria-label="Add an item"
        >
          <option value="">{remaining.length ? "+ Add…" : "All items added"}</option>
          {remaining.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      )}
    </div>
  );
}

type Row = Record<string, unknown> & { __key?: string };

/** Repeating groups of fields (cards, stats, photos, speakers). Drag to reorder, collapse to tidy. */
function Repeater({
  value,
  onChange,
  fields,
  itemLabel,
  titleField,
  max = 50,
  ctx,
  path,
}: {
  value: Row[];
  onChange: (v: Row[]) => void;
  fields: FieldDef[];
  itemLabel: string;
  titleField?: string;
  max?: number;
  ctx: FieldContext;
  path: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Every row gets a client-only key for drag-and-drop (stored with the row on the first change,
  // stripped before saving).
  const rows = value.map((r, i) => (r.__key ? r : { ...r, __key: `i${i}` }));

  const update = (i: number, name: string, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [name]: v } : r)));
  const add = () => {
    const key = `n${Date.now()}`;
    onChange([...rows, { ...emptyValues(fields), __key: key }]);
    setOpen((o) => ({ ...o, [key]: true }));
  };

  return (
    <div className="space-y-2">
      <SortableList
        items={rows}
        getId={(r) => r.__key as string}
        onReorder={onChange}
        className="space-y-2"
        renderItem={(row, handle, i) => {
          const key = row.__key as string;
          const isOpen = open[key] ?? false;
          const title = (titleField && typeof row[titleField] === "string" && (row[titleField] as string)) || `${itemLabel} ${i + 1}`;
          const hasError = Object.keys(ctx.errors).some((k) => k.startsWith(`${path}.${i}.`));
          return (
            <div className={cn("rounded-md border bg-white", hasError ? "border-danger" : "border-border")}>
              <div className="flex items-center gap-1 px-1 py-1">
                {handle}
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium text-secondary hover:bg-muted">
                  <ChevronDown className={cn("size-4 shrink-0 transition-transform", !isOpen && "-rotate-90")} aria-hidden />
                  <span className="truncate">{title}</span>
                  {hasError && <span className="text-xs font-normal text-danger">— fix errors</span>}
                </button>
                <button type="button" onClick={() => rows.length < max && onChange([...rows.slice(0, i + 1), { ...row, __key: `d${Date.now()}` }, ...rows.slice(i + 1)])} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-secondary" aria-label={`Duplicate ${title}`}>
                  <Copy className="size-4" />
                </button>
                <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded p-1.5 text-danger hover:bg-danger-soft" aria-label={`Remove ${title}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              {isOpen && (
                <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
                  {fields.map((sf) => (
                    <Field key={sf.name} field={sf} value={row[sf.name]} onChange={(v) => update(i, sf.name, v)} ctx={ctx} path={`${path}.${i}.${sf.name}`} />
                  ))}
                </div>
              )}
            </div>
          );
        }}
      />
      <Button type="button" size="sm" variant="outline" onClick={add} disabled={rows.length >= max}>
        <Plus /> Add {itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

/** Lays out fields in a two-column grid. */
export function FieldGrid({ fields, ctx, onChange }: { fields: FieldDef[]; ctx: FieldContext; onChange: (name: string, v: unknown) => void }): ReactNode {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {fields.map((f) => (
        <Field key={f.name} field={f} value={ctx.values[f.name]} onChange={(v) => onChange(f.name, v)} ctx={ctx} />
      ))}
    </div>
  );
}

/** Remove client-only keys before sending to the server. */
export function stripKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => k !== "__key").map(([k, x]) => [k, stripKeys(x)]));
  }
  return v;
}
