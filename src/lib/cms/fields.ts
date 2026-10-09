/**
 * Field definitions drive the CMS: the admin form renders them, and the server builds its
 * zod validation from the very same definitions (src/lib/cms/schema.ts). Shared by client + server.
 */
import type { MediaFolder } from "./media";

export type Option = { value: string; label: string };

/** Tables an admin can pick entries from (relation fields, featured-content pickers). */
export type RelationSource =
  | "program_categories"
  | "resource_categories"
  | "programs"
  | "organizations"
  | "partners"
  | "events"
  | "opportunities"
  | "projects"
  | "resources"
  | "stories";

type Base = {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Which part of the editor the field lives in. */
  group?: "main" | "details" | "media" | "seo" | "sidebar";
  /** Half-width on large screens. */
  half?: boolean;
};

export type FieldDef = Base &
  (
    | { kind: "text"; max?: number; placeholder?: string }
    | { kind: "slug"; from: string }
    | { kind: "textarea"; max?: number; rows?: number }
    | { kind: "richtext"; max?: number }
    | { kind: "number"; min?: number; max?: number; step?: number; integer?: boolean }
    | { kind: "url"; allowRelative?: boolean; placeholder?: string }
    | { kind: "email" }
    | { kind: "date" }
    | { kind: "datetime" }
    | { kind: "select"; options: Option[]; placeholder?: string }
    | { kind: "boolean" }
    | { kind: "tags"; max?: number; placeholder?: string }
    | { kind: "list"; max?: number; itemLabel?: string }
    | { kind: "image"; folder: MediaFolder }
    | { kind: "gallery"; folder: MediaFolder; max?: number }
    | { kind: "file"; folder: MediaFolder }
    | { kind: "documents"; folder: MediaFolder }
    | { kind: "relation"; source: RelationSource; placeholder?: string }
    | { kind: "relation_multi"; source: RelationSource; max?: number }
    | { kind: "link" }
    | { kind: "icon" }
    | { kind: "repeater"; fields: FieldDef[]; itemLabel: string; max?: number; titleField?: string }
    | { kind: "speakers" }
  );

export type FieldKind = FieldDef["kind"];

/** Icons an editor can choose for cards (lucide names, rendered by src/components/cms/icon.tsx). */
export const ICON_OPTIONS: Option[] = [
  "graduation-cap", "laptop", "users", "briefcase", "lightbulb", "heart-handshake", "hand-heart", "handshake",
  "target", "eye", "sparkles", "flag", "shield-check", "door-open", "school", "award", "compass", "network",
  "user-plus", "book-open", "globe", "megaphone", "rocket", "calendar", "map-pin", "star", "trophy", "sprout",
].map((v) => ({ value: v, label: v.replace(/-/g, " ") }));

/** Default (empty) value for a field, as held in the form. */
export function emptyValue(f: FieldDef): unknown {
  switch (f.kind) {
    case "boolean":
      return false;
    case "tags":
    case "list":
    case "gallery":
    case "documents":
    case "relation_multi":
    case "repeater":
    case "speakers":
      return [];
    case "link":
      return { label: "", href: "" };
    case "number":
      return "";
    default:
      return "";
  }
}

export function emptyValues(fields: FieldDef[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.name, emptyValue(f)]));
}

export const SEO_FIELDS: FieldDef[] = [
  { kind: "text", name: "seo_title", label: "SEO title", max: 70, group: "seo", help: "Shown in search results and browser tabs. Leave empty to use the title." },
  { kind: "textarea", name: "seo_description", label: "SEO description", max: 170, rows: 3, group: "seo", help: "About 150 characters summarizing the page for search results." },
];
