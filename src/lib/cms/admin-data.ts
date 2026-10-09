import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RELATION_SOURCES, type CollectionDef } from "./collections";
import { emptyValue, type FieldDef, type Option } from "./fields";
import { isoToEatLocal } from "./schema";

/** Loads option lists for every relation field in `fields` (recursing into repeaters). */
export async function loadRelations(supabase: SupabaseClient, fields: FieldDef[]): Promise<Record<string, Option[]>> {
  const sources = new Set<string>();
  const walk = (fs: FieldDef[]) =>
    fs.forEach((f) => {
      if (f.kind === "relation" || f.kind === "relation_multi") sources.add(f.source);
      if (f.kind === "repeater") walk(f.fields);
    });
  walk(fields);
  const entries = await Promise.all(
    [...sources].map(async (source) => {
      const s = RELATION_SOURCES[source];
      const { data } = await supabase.from(s.table).select(`id, ${s.labelColumn}`).order(s.orderColumn, { ascending: s.orderColumn !== "updated_at" && s.orderColumn !== "starts_at" }).limit(300);
      const rows = (data ?? []) as unknown as Record<string, string>[];
      return [source, rows.map((r) => ({ value: r.id, label: r[s.labelColumn] || "(untitled)" }))] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Database value → form value for one field. */
function toFormValue(f: FieldDef, v: unknown): unknown {
  if (v == null) return emptyValue(f);
  switch (f.kind) {
    case "datetime":
      return isoToEatLocal(String(v));
    case "number":
      return String(v);
    case "date":
      return String(v).slice(0, 10);
    case "select":
      return String(v);
    default:
      return v;
  }
}

export function rowToValues(fields: FieldDef[], row: Record<string, unknown> | null): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.name, row ? toFormValue(f, row[f.name]) : emptyValue(f)]));
}

/** Defaults for a brand-new entry. */
export function newEntryValues(def: CollectionDef): Record<string, unknown> {
  const values = rowToValues(def.fields, null);
  if (def.key === "opportunities") Object.assign(values, { apply_mode: "internal", type: "training" });
  if (def.key === "events") Object.assign(values, { event_status: "upcoming", event_type: "workshop", attendance_mode: "in_person" });
  if (def.key === "projects") values.project_status = "planned";
  if (def.key === "resources") values.resource_type = "guide";
  if (def.key === "stories") values.consent_status = "pending";
  if (def.key === "faqs") values.category = "general";
  return values;
}

/** Loads one entry (plus related rows) as form values. */
export async function loadEntry(supabase: SupabaseClient, def: CollectionDef, id: string) {
  const { data: row } = await supabase.from(def.table).select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const values = rowToValues(def.fields, row as Record<string, unknown>);
  if (def.key === "events") {
    const { data } = await supabase.from("event_speakers").select("name, role_title, bio, image_url").eq("event_id", id).order("position");
    values.speakers = (data ?? []).map((s, i) => ({ ...s, role_title: s.role_title ?? "", bio: s.bio ?? "", image_url: s.image_url ?? "", __key: `s${i}` }));
  }
  if (def.key === "projects") {
    const { data } = await supabase.from("project_partners").select("partner_id").eq("project_id", id);
    values.partner_ids = (data ?? []).map((p) => p.partner_id as string);
  }
  const r = row as Record<string, unknown>;
  return {
    values,
    meta: {
      status: (r.status as string | undefined) ?? null,
      is_featured: r.is_featured as boolean | undefined,
      is_visible: r.is_visible as boolean | undefined,
      updated_at: (r.updated_at as string | undefined) ?? null,
      published_at: (r.published_at as string | undefined) ?? null,
    },
  };
}
