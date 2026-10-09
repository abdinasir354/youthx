/**
 * Every CMS collection in one place. The admin list page, the editor, the server actions and
 * the public cache tags are all driven from these definitions.
 */
import type { Perm } from "@/lib/permissions";
import { OPPORTUNITY_TYPES, REGIONS } from "@/types/database.types";
import { SEO_FIELDS, type FieldDef, type Option } from "./fields";

export type StatusSet = "content" | "opportunity" | "none";

export type CollectionDef = {
  key: CollectionKey;
  table: string;
  label: string;
  singular: string;
  description: string;
  perm: Perm;
  /** Column shown as the entry's name. */
  titleField: string;
  statusSet: StatusSet;
  /** Has a `position` column → drag-and-drop ordering. */
  sortable: boolean;
  /** Has an `is_featured` column. */
  featurable: boolean;
  /** Has an `is_visible` column (simple show/hide instead of a publishing workflow). */
  visibility: boolean;
  /** Public URL of one entry (for "View" / preview links). */
  publicPath?: (slug: string) => string;
  fields: FieldDef[];
  /** Extra columns in the list table. */
  columns: { name: string; label: string; format?: "date" | "datetime" | "label" | "bool" }[];
  searchColumns: string[];
  orderBy: { column: string; ascending: boolean };
  /** Cache tags refreshed after every change. */
  tags: string[];
};

export const COLLECTION_KEYS = [
  "programs", "opportunities", "events", "projects", "resources", "stories", "faqs", "partners",
  "program-categories", "resource-categories",
] as const;
export type CollectionKey = (typeof COLLECTION_KEYS)[number];

const label = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const opts = (values: readonly string[]): Option[] => values.map((v) => ({ value: v, label: label(v) }));

export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;
export const OPPORTUNITY_STATUSES_CMS = ["draft", "pending_review", "published", "closed", "archived"] as const;

export function statusesFor(set: StatusSet): readonly string[] {
  return set === "content" ? CONTENT_STATUSES : set === "opportunity" ? OPPORTUNITY_STATUSES_CMS : [];
}

const title = (max = 160): FieldDef => ({ kind: "text", name: "title", label: "Title", required: true, max });
const slug: FieldDef = { kind: "slug", name: "slug", label: "URL slug", from: "title", required: true, help: "Lowercase letters, numbers and dashes. Changing it changes the page address." };

export const COLLECTIONS: Record<CollectionKey, CollectionDef> = {
  programs: {
    key: "programs",
    table: "programs",
    label: "Programs",
    singular: "Program",
    description: "Education, skills, mentorship and other programs shown on the Programs page.",
    perm: "programs",
    titleField: "title",
    statusSet: "content",
    sortable: true,
    featurable: true,
    visibility: false,
    publicPath: (s) => `/programs/${s}`,
    fields: [
      title(),
      slug,
      { kind: "textarea", name: "short_description", label: "Short description", max: 300, rows: 3, help: "One or two sentences for cards and search results." },
      { kind: "richtext", name: "description", label: "Full description" },
      { kind: "list", name: "objectives", label: "Objectives", itemLabel: "Objective", max: 20 },
      { kind: "relation", name: "category_id", label: "Category", source: "program_categories", group: "details", placeholder: "No category" },
      { kind: "text", name: "target_audience", label: "Target audience", max: 300, group: "details" },
      { kind: "text", name: "duration", label: "Duration", max: 120, group: "details", placeholder: "e.g. 8 weeks", half: true },
      { kind: "text", name: "location", label: "Location", max: 160, group: "details", placeholder: "e.g. Mogadishu or Online", half: true },
      { kind: "url", name: "registration_url", label: "Registration link", allowRelative: true, group: "details" },
      { kind: "url", name: "application_url", label: "Application link", allowRelative: true, group: "details" },
      { kind: "image", name: "featured_image_url", label: "Featured image", folder: "programs", group: "media" },
      { kind: "gallery", name: "gallery", label: "Gallery", folder: "programs", group: "media", max: 24 },
      ...SEO_FIELDS,
    ],
    columns: [{ name: "updated_at", label: "Updated", format: "date" }],
    searchColumns: ["title", "short_description"],
    orderBy: { column: "position", ascending: true },
    tags: ["programs"],
  },

  opportunities: {
    key: "opportunities",
    table: "opportunities",
    label: "Opportunities",
    singular: "Opportunity",
    description: "Scholarships, internships, jobs and more. Partner submissions arrive here as “Pending review”.",
    perm: "programs",
    titleField: "title",
    statusSet: "opportunity",
    sortable: false,
    featurable: true,
    visibility: false,
    publicPath: (s) => `/opportunities/${s}`,
    fields: [
      title(),
      slug,
      { kind: "select", name: "type", label: "Type", required: true, options: opts(OPPORTUNITY_TYPES), half: true },
      { kind: "text", name: "organization_name", label: "Organization (if not a partner account)", max: 160, half: true },
      { kind: "textarea", name: "summary", label: "Summary", max: 300, rows: 3 },
      { kind: "richtext", name: "description", label: "Description" },
      { kind: "richtext", name: "requirements", label: "Eligibility" },
      { kind: "select", name: "apply_mode", label: "How to apply", required: true, group: "details", options: [
        { value: "internal", label: "Contact Youthup (opens our contact form)" },
        { value: "external", label: "External link (the organizer's own form)" },
      ] },
      { kind: "url", name: "application_url", label: "Application URL", group: "details", help: "Only for external links." },
      { kind: "datetime", name: "apply_deadline", label: "Deadline", group: "details", half: true },
      { kind: "datetime", name: "expires_at", label: "Hide listing after", group: "details", half: true, help: "Defaults to the deadline." },
      { kind: "select", name: "region", label: "Region", group: "details", options: opts(REGIONS), placeholder: "Any region", half: true },
      { kind: "text", name: "location", label: "Location", max: 160, group: "details", half: true },
      { kind: "boolean", name: "is_remote", label: "Remote / online", group: "details" },
      { kind: "relation", name: "organization_id", label: "Partner organization", source: "organizations", group: "details", placeholder: "None" },
      { kind: "number", name: "capacity", label: "Number of places (optional)", integer: true, min: 1, max: 100000, group: "details", half: true },
      { kind: "image", name: "cover_url", label: "Featured image", folder: "images", group: "media" },
      { kind: "file", name: "attachment_url", label: "Attachment (call for applications, flyer…)", folder: "documents", group: "media" },
      ...SEO_FIELDS,
    ],
    columns: [
      { name: "type", label: "Type", format: "label" },
      { name: "apply_deadline", label: "Deadline", format: "date" },
    ],
    searchColumns: ["title", "summary", "organization_name"],
    orderBy: { column: "updated_at", ascending: false },
    tags: ["opportunities", "seats", "stats"],
  },

  events: {
    key: "events",
    table: "events",
    label: "Events",
    singular: "Event",
    description: "Workshops, trainings, webinars and gatherings.",
    perm: "programs",
    titleField: "title",
    statusSet: "content",
    sortable: false,
    featurable: true,
    visibility: false,
    publicPath: (s) => `/events/${s}`,
    fields: [
      title(),
      slug,
      { kind: "textarea", name: "summary", label: "Summary", max: 300, rows: 3 },
      { kind: "richtext", name: "description", label: "Description" },
      { kind: "speakers", name: "speakers", label: "Speakers" },
      { kind: "select", name: "event_status", label: "Event status", required: true, group: "details", options: opts(["upcoming", "registration_open", "ongoing", "completed", "cancelled"]) },
      { kind: "select", name: "event_type", label: "Event type", required: true, group: "details", options: opts(["workshop", "training", "webinar", "conference", "meetup", "competition", "networking", "other"]), half: true },
      { kind: "select", name: "attendance_mode", label: "Format", required: true, group: "details", options: [
        { value: "in_person", label: "In person" }, { value: "online", label: "Online" }, { value: "hybrid", label: "Hybrid" },
      ], half: true },
      { kind: "datetime", name: "starts_at", label: "Starts", required: true, group: "details", half: true },
      { kind: "datetime", name: "ends_at", label: "Ends", group: "details", half: true },
      { kind: "text", name: "location", label: "Location", max: 200, group: "details" },
      { kind: "url", name: "online_url", label: "Online link", group: "details" },
      { kind: "url", name: "registration_url", label: "Registration link", allowRelative: true, group: "details" },
      { kind: "number", name: "capacity", label: "Capacity", integer: true, min: 1, max: 1000000, group: "details", half: true },
      { kind: "relation", name: "program_id", label: "Related program", source: "programs", group: "details", placeholder: "None", half: true },
      { kind: "image", name: "featured_image_url", label: "Featured image", folder: "events", group: "media" },
      ...SEO_FIELDS,
    ],
    columns: [
      { name: "starts_at", label: "Date", format: "datetime" },
      { name: "event_status", label: "Event status", format: "label" },
    ],
    searchColumns: ["title", "summary", "location"],
    orderBy: { column: "starts_at", ascending: false },
    tags: ["events"],
  },

  projects: {
    key: "projects",
    table: "projects",
    label: "Projects",
    singular: "Project",
    description: "Initiatives shown on the Home, About and Programs pages.",
    perm: "content",
    titleField: "title",
    statusSet: "content",
    sortable: false,
    featurable: true,
    visibility: false,
    publicPath: (s) => `/projects/${s}`,
    fields: [
      title(),
      slug,
      { kind: "textarea", name: "summary", label: "Summary", max: 300, rows: 3 },
      { kind: "richtext", name: "description", label: "Full description" },
      { kind: "richtext", name: "problem", label: "The problem" },
      { kind: "richtext", name: "solution", label: "Our solution" },
      { kind: "list", name: "objectives", label: "Objectives", itemLabel: "Objective", max: 20 },
      { kind: "list", name: "activities", label: "Activities", itemLabel: "Activity", max: 30 },
      { kind: "richtext", name: "impact", label: "Impact" },
      { kind: "select", name: "project_status", label: "Project status", required: true, group: "details", options: opts(["planned", "active", "ongoing", "completed"]) },
      { kind: "date", name: "start_date", label: "Start date", group: "details", half: true },
      { kind: "date", name: "end_date", label: "End date", group: "details", half: true },
      { kind: "text", name: "location", label: "Location", max: 200, group: "details" },
      { kind: "relation", name: "program_id", label: "Related program", source: "programs", group: "details", placeholder: "None" },
      { kind: "relation_multi", name: "partner_ids", label: "Partners", source: "partners", group: "details" },
      { kind: "image", name: "featured_image_url", label: "Featured image", folder: "projects", group: "media" },
      { kind: "gallery", name: "gallery", label: "Gallery", folder: "projects", group: "media", max: 24 },
      { kind: "documents", name: "documents", label: "Documents", folder: "projects", group: "media" },
      ...SEO_FIELDS,
    ],
    columns: [{ name: "project_status", label: "Project status", format: "label" }],
    searchColumns: ["title", "summary", "location"],
    orderBy: { column: "updated_at", ascending: false },
    tags: ["projects"],
  },

  resources: {
    key: "resources",
    table: "resources",
    label: "Resources",
    singular: "Resource",
    description: "Guides, reports, toolkits, videos and downloads.",
    perm: "content",
    titleField: "title",
    statusSet: "content",
    sortable: false,
    featurable: true,
    visibility: false,
    publicPath: (s) => `/resources/${s}`,
    fields: [
      title(),
      slug,
      { kind: "textarea", name: "description", label: "Description", max: 500, rows: 3 },
      { kind: "richtext", name: "body", label: "Article text (optional)" },
      { kind: "select", name: "resource_type", label: "Type", required: true, group: "details", options: opts(["article", "guide", "report", "document", "video", "educational_material", "toolkit"]) },
      { kind: "relation", name: "category_id", label: "Category", source: "resource_categories", group: "details", placeholder: "No category" },
      { kind: "text", name: "author", label: "Author", max: 160, group: "details" },
      { kind: "url", name: "external_url", label: "External link / video URL", group: "details" },
      { kind: "relation", name: "program_id", label: "Related program", source: "programs", group: "details", placeholder: "None" },
      { kind: "image", name: "cover_image_url", label: "Cover image", folder: "resources", group: "media" },
      { kind: "file", name: "file_url", label: "Downloadable file", folder: "resources", group: "media" },
      ...SEO_FIELDS,
    ],
    columns: [{ name: "resource_type", label: "Type", format: "label" }],
    searchColumns: ["title", "description", "author"],
    orderBy: { column: "updated_at", ascending: false },
    tags: ["resources"],
  },

  stories: {
    key: "stories",
    table: "stories",
    label: "Stories",
    singular: "Story",
    description: "Real youth stories — publishable only with recorded consent.",
    perm: "content",
    titleField: "title",
    statusSet: "content",
    sortable: false,
    featurable: true,
    visibility: false,
    publicPath: (s) => `/stories/${s}`,
    fields: [
      title(),
      slug,
      { kind: "text", name: "person_name", label: "Person's name", required: true, max: 120 },
      { kind: "textarea", name: "introduction", label: "Introduction", max: 500, rows: 3 },
      { kind: "richtext", name: "body", label: "Full story" },
      { kind: "textarea", name: "quote", label: "Quote", max: 400, rows: 2 },
      { kind: "select", name: "consent_status", label: "Consent", required: true, group: "details", options: [
        { value: "pending", label: "Pending — not publishable" },
        { value: "granted", label: "Granted" },
        { value: "withdrawn", label: "Withdrawn — will be unpublished" },
      ], help: "A story can only be published once the person has given consent." },
      { kind: "textarea", name: "consent_notes", label: "Consent notes (internal)", max: 1000, rows: 2, group: "details", help: "How and when consent was given. Never shown publicly." },
      { kind: "relation", name: "program_id", label: "Related program", source: "programs", group: "details", placeholder: "None" },
      { kind: "image", name: "profile_image_url", label: "Photo", folder: "stories", group: "media" },
      ...SEO_FIELDS,
    ],
    columns: [
      { name: "person_name", label: "Person" },
      { name: "consent_status", label: "Consent", format: "label" },
    ],
    searchColumns: ["title", "person_name"],
    orderBy: { column: "updated_at", ascending: false },
    tags: ["stories"],
  },

  faqs: {
    key: "faqs",
    table: "faqs",
    label: "FAQs",
    singular: "FAQ",
    description: "Questions and answers. Add an FAQ section to any page and choose a category.",
    perm: "content",
    titleField: "question",
    statusSet: "none",
    sortable: true,
    featurable: false,
    visibility: true,
    fields: [
      { kind: "text", name: "question", label: "Question", required: true, max: 300 },
      { kind: "richtext", name: "answer", label: "Answer", required: true, max: 5000 },
      { kind: "text", name: "category", label: "Category", required: true, max: 60, group: "details", placeholder: "general", help: "Lowercase key, e.g. general, mentorship, get-involved." },
    ],
    columns: [{ name: "category", label: "Category" }],
    searchColumns: ["question", "answer"],
    orderBy: { column: "position", ascending: true },
    tags: ["faqs"],
  },

  partners: {
    key: "partners",
    table: "partners",
    label: "Partners",
    singular: "Partner",
    description: "Partner logos shown on the website. Only list real, confirmed partners.",
    perm: "content",
    titleField: "name",
    statusSet: "none",
    sortable: true,
    featurable: false,
    visibility: true,
    fields: [
      { kind: "text", name: "name", label: "Name", required: true, max: 160 },
      { kind: "url", name: "website", label: "Website" },
      { kind: "textarea", name: "description", label: "Description", max: 500, rows: 3 },
      { kind: "image", name: "logo_url", label: "Logo", folder: "images", group: "media" },
    ],
    columns: [{ name: "website", label: "Website" }],
    searchColumns: ["name"],
    orderBy: { column: "position", ascending: true },
    tags: ["partners"],
  },

  "program-categories": {
    key: "program-categories",
    table: "program_categories",
    label: "Program categories",
    singular: "Program category",
    description: "Groups used to filter programs.",
    perm: "programs",
    titleField: "name",
    statusSet: "none",
    sortable: true,
    featurable: false,
    visibility: false,
    fields: [
      { kind: "text", name: "name", label: "Name", required: true, max: 80 },
      { kind: "slug", name: "slug", label: "Slug", from: "name", required: true },
    ],
    columns: [{ name: "slug", label: "Slug" }],
    searchColumns: ["name"],
    orderBy: { column: "position", ascending: true },
    tags: ["programs"],
  },

  "resource-categories": {
    key: "resource-categories",
    table: "resource_categories",
    label: "Resource categories",
    singular: "Resource category",
    description: "Groups used to filter resources.",
    perm: "content",
    titleField: "name",
    statusSet: "none",
    sortable: true,
    featurable: false,
    visibility: false,
    fields: [
      { kind: "text", name: "name", label: "Name", required: true, max: 80 },
      { kind: "slug", name: "slug", label: "Slug", from: "name", required: true },
    ],
    columns: [{ name: "slug", label: "Slug" }],
    searchColumns: ["name"],
    orderBy: { column: "position", ascending: true },
    tags: ["resources"],
  },
};

export function getCollection(key: string): CollectionDef | null {
  return (COLLECTION_KEYS as readonly string[]).includes(key) ? COLLECTIONS[key as CollectionKey] : null;
}

/** Label + display column for relation pickers. */
export const RELATION_SOURCES: Record<string, { table: string; labelColumn: string; orderColumn: string }> = {
  program_categories: { table: "program_categories", labelColumn: "name", orderColumn: "position" },
  resource_categories: { table: "resource_categories", labelColumn: "name", orderColumn: "position" },
  programs: { table: "programs", labelColumn: "title", orderColumn: "position" },
  organizations: { table: "organizations", labelColumn: "name", orderColumn: "name" },
  partners: { table: "partners", labelColumn: "name", orderColumn: "position" },
  events: { table: "events", labelColumn: "title", orderColumn: "starts_at" },
  opportunities: { table: "opportunities", labelColumn: "title", orderColumn: "updated_at" },
  projects: { table: "projects", labelColumn: "title", orderColumn: "updated_at" },
  resources: { table: "resources", labelColumn: "title", orderColumn: "updated_at" },
  stories: { table: "stories", labelColumn: "title", orderColumn: "updated_at" },
};
