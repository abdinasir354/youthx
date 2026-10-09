/**
 * Page-builder section types. Each type's fields drive both the section editor and the
 * server-side validation of `page_sections.data`. Renderers live in src/components/cms/sections.
 */
import type { FieldDef, Option } from "./fields";

export const SECTION_TYPES = [
  "hero", "rich_text", "image_text", "cards", "program_grid", "opportunity_grid", "event_grid",
  "story_grid", "project_grid", "resource_grid", "cta", "faq", "statistics", "gallery", "video", "partner_logos",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export type SectionDef = {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
  fields: FieldDef[];
  /** Data for a newly added section. */
  defaults: Record<string, unknown>;
};

const eyebrow: FieldDef = { kind: "text", name: "eyebrow", label: "Eyebrow (small label above the heading)", max: 60 };
const heading = (required = false): FieldDef => ({ kind: "text", name: "heading", label: "Heading", max: 160, required });
const intro: FieldDef = { kind: "textarea", name: "intro", label: "Introduction", max: 600, rows: 3 };
const link = (name: string, label: string): FieldDef => ({ kind: "link", name, label });

export const LIVE_METRICS: Option[] = [
  { value: "programs", label: "Published programs (live)" },
  { value: "opportunities", label: "Opportunities shared (live)" },
  { value: "events", label: "Events (live)" },
  { value: "projects", label: "Projects (live)" },
  { value: "youth_registered", label: "Registered youth (live)" },
  { value: "mentors", label: "Approved mentors (live)" },
  { value: "partners", label: "Partners (live)" },
  { value: "courses", label: "Courses (live)" },
  { value: "accepted_total", label: "Applicants accepted (live)" },
  { value: "custom", label: "Custom number (from your own records)" },
];

function grid(type: SectionType, label: string, source: "programs" | "opportunities" | "events" | "stories" | "projects" | "resources"): SectionDef {
  return {
    type,
    label,
    description: `Shows ${source} — featured, latest, or hand-picked.`,
    icon: "layout-grid",
    fields: [
      eyebrow,
      heading(),
      intro,
      { kind: "select", name: "mode", label: "Which items", required: true, options: [
        { value: "featured", label: "Featured items" },
        { value: "latest", label: source === "events" ? "Upcoming" : "Latest" },
        { value: "selected", label: "Hand-picked (choose below)" },
      ] },
      { kind: "relation_multi", name: "ids", label: "Hand-picked items (in order)", source, max: 12, help: "Used when “Which items” is Hand-picked." },
      { kind: "number", name: "limit", label: "How many", integer: true, min: 1, max: 12, half: true },
      ...(source === "stories"
        ? [{ kind: "select", name: "display", label: "Display", options: [
            { value: "spotlight", label: "Spotlight card (quote + link to the story)" },
            { value: "full", label: "Full story (first story, told as chapters)" },
          ] } satisfies FieldDef]
        : []),
      { kind: "boolean", name: "hide_when_empty", label: "Hide the whole section when there's nothing to show" },
      { kind: "text", name: "empty_text", label: "Message when empty", max: 200 },
      link("cta", "Button below the grid"),
    ],
    defaults: { heading: label, mode: source === "events" || source === "opportunities" ? "latest" : "featured", ids: [], limit: 3, hide_when_empty: true },
  };
}

export const SECTIONS: Record<SectionType, SectionDef> = {
  hero: {
    type: "hero", label: "Hero", description: "Big two-tone headline, photo collage, badges and buttons.", icon: "panel-top",
    fields: [
      { kind: "select", name: "layout", label: "Layout", options: [
        { value: "collage", label: "Text left, photo collage right" },
        { value: "centered", label: "Centered headline, wide photo below" },
        { value: "index", label: "Compact dark banner with program categories" },
      ] },
      { kind: "text", name: "eyebrow", label: "Badge (small pill above the headline)", max: 60 },
      { kind: "text", name: "heading", label: "Headline — first part (dark)", max: 120, required: true },
      { kind: "text", name: "heading_accent", label: "Headline — second part (lime)", max: 120 },
      { kind: "textarea", name: "subheading", label: "Supporting text", max: 600, rows: 3 },
      link("primary_cta", "Primary button"),
      link("secondary_cta", "Secondary button"),
      { kind: "image", name: "image_url", label: "Main photo (large, right)", folder: "images" },
      { kind: "text", name: "image_alt", label: "Main photo description (alt text)", max: 200 },
      { kind: "image", name: "image2_url", label: "Second photo (small, overlapping)", folder: "images" },
      { kind: "text", name: "image2_alt", label: "Second photo description (alt text)", max: 200 },
      { kind: "text", name: "stat_value", label: "Round badge — big text", max: 12, half: true, placeholder: "15–35" },
      { kind: "text", name: "stat_label", label: "Round badge — small text", max: 30, half: true, placeholder: "Your next chapter" },
      { kind: "text", name: "card_label", label: "Floating card — label", max: 30, half: true, placeholder: "Our mission" },
      { kind: "text", name: "card_text", label: "Floating card — text", max: 60, half: true, placeholder: "Learn. Grow. Connect." },
      { kind: "repeater", name: "facts", label: "Fact chips (centered layout)", itemLabel: "Fact", titleField: "value", max: 4, fields: [
        { kind: "text", name: "value", label: "Big text", required: true, max: 30, half: true },
        { kind: "text", name: "label", label: "Small text", max: 40, half: true },
      ] },
    ],
    defaults: { heading: "New headline." },
  },
  rich_text: {
    type: "rich_text", label: "Rich text", description: "Headings, paragraphs, lists and links.", icon: "text",
    fields: [
      eyebrow,
      heading(),
      { kind: "richtext", name: "body", label: "Text", required: true, max: 50000 },
      { kind: "select", name: "width", label: "Width", options: [{ value: "wide", label: "Wide" }, { value: "narrow", label: "Narrow (easier to read)" }] },
    ],
    defaults: { body: "", width: "wide" },
  },
  image_text: {
    type: "image_text", label: "Image + text", description: "Text beside an image, with an optional button.", icon: "image",
    fields: [
      eyebrow,
      heading(true),
      { kind: "richtext", name: "body", label: "Text", max: 20000 },
      { kind: "image", name: "image_url", label: "Image", folder: "images" },
      { kind: "text", name: "image_alt", label: "Image description (alt text)", max: 200 },
      { kind: "select", name: "image_side", label: "Image position", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] },
      { kind: "text", name: "stat_value", label: "Floating card on the photo — big text", max: 12, half: true, placeholder: "15–35" },
      { kind: "text", name: "stat_label", label: "Floating card — small text", max: 40, half: true, placeholder: "The youth we serve" },
      link("cta", "Button"),
    ],
    defaults: { heading: "New section.", image_side: "left" },
  },
  cards: {
    type: "cards", label: "Cards", description: "A grid of cards with icons — values, services, team, steps.", icon: "layout-grid",
    fields: [
      eyebrow,
      heading(),
      intro,
      { kind: "select", name: "columns", label: "Columns", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }], half: true },
      { kind: "select", name: "style", label: "Style", half: true, options: [
        { value: "plain", label: "Cards with icons" },
        { value: "numbered", label: "Numbered steps (connected journey)" },
        { value: "statement", label: "Big statement panels (e.g. mission & vision)" },
        { value: "list", label: "Numbered list (editorial)" },
        { value: "bento", label: "Bento grid (heading tile + icon tiles)" },
        { value: "chips", label: "Chips / tags" },
        { value: "timeline", label: "Timeline (our journey)" },
        { value: "team", label: "Team members" },
      ] },
      { kind: "repeater", name: "items", label: "Items", itemLabel: "Item", titleField: "title", max: 24, fields: [
        { kind: "text", name: "title", label: "Title / name", required: true, max: 120, half: true },
        { kind: "icon", name: "icon", label: "Icon (cards style)", half: true },
        { kind: "text", name: "subtitle", label: "Small label — timeline badge or team member's role", max: 60, half: true },
        { kind: "text", name: "date_label", label: "Date (timeline style, e.g. Jan 2026)", max: 30, half: true },
        { kind: "textarea", name: "body", label: "Text", max: 800, rows: 3 },
        { kind: "textarea", name: "quote", label: "Quote (team style)", max: 300, rows: 2 },
        { kind: "image", name: "image_url", label: "Photo", folder: "images" },
        { kind: "text", name: "image_alt", label: "Photo description (alt text)", max: 200 },
        link("link", "Link"),
      ] },
    ],
    defaults: { columns: "3", style: "plain", items: [] },
  },
  program_grid: grid("program_grid", "Program grid", "programs"),
  opportunity_grid: grid("opportunity_grid", "Opportunity grid", "opportunities"),
  event_grid: grid("event_grid", "Event grid", "events"),
  story_grid: grid("story_grid", "Story grid", "stories"),
  project_grid: grid("project_grid", "Project grid", "projects"),
  resource_grid: grid("resource_grid", "Resource grid", "resources"),
  cta: {
    type: "cta", label: "Call to action", description: "A banner with a heading and buttons.", icon: "megaphone",
    fields: [
      heading(true),
      { kind: "textarea", name: "body", label: "Text", max: 600, rows: 2 },
      link("primary_cta", "Primary button"),
      link("secondary_cta", "Secondary button"),
      { kind: "select", name: "tone", label: "Style", options: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "accent", label: "Accent (lime)" }] },
    ],
    defaults: { heading: "Get involved", tone: "dark" },
  },
  faq: {
    type: "faq", label: "FAQ", description: "Questions from the FAQs list, filtered by category.", icon: "circle-help",
    fields: [
      heading(),
      intro,
      { kind: "text", name: "category", label: "FAQ category", required: true, max: 60, help: "Matches the Category of entries under Content → FAQs." },
    ],
    defaults: { heading: "Frequently asked questions", category: "general" },
  },
  statistics: {
    type: "statistics", label: "Statistics", description: "Impact numbers — live counts or numbers from your records.", icon: "bar-chart-3",
    fields: [
      eyebrow,
      heading(),
      intro,
      { kind: "boolean", name: "hide_when_zero", label: "Hide numbers that are zero (and the section if all are)" },
      { kind: "repeater", name: "items", label: "Numbers", itemLabel: "Number", titleField: "label", max: 8, fields: [
        { kind: "select", name: "metric", label: "Source", required: true, options: LIVE_METRICS, half: true },
        { kind: "text", name: "label", label: "Label", required: true, max: 80, half: true },
        { kind: "text", name: "value", label: "Value (custom numbers only)", max: 20, help: "Only enter real figures you can back up." },
      ] },
    ],
    defaults: { hide_when_zero: true, items: [] },
  },
  gallery: {
    type: "gallery", label: "Gallery", description: "A grid of photos.", icon: "images",
    fields: [
      heading(),
      intro,
      { kind: "repeater", name: "images", label: "Photos", itemLabel: "Photo", titleField: "caption", max: 40, fields: [
        { kind: "image", name: "url", label: "Photo", folder: "images", required: true },
        { kind: "text", name: "alt", label: "Description (alt text)", max: 200, required: true },
        { kind: "text", name: "caption", label: "Caption", max: 200 },
      ] },
    ],
    defaults: { images: [] },
  },
  video: {
    type: "video", label: "Video", description: "An embedded YouTube or Vimeo video.", icon: "video",
    fields: [
      heading(),
      { kind: "url", name: "url", label: "YouTube or Vimeo link", required: true },
      { kind: "text", name: "caption", label: "Caption", max: 300 },
    ],
    defaults: {},
  },
  partner_logos: {
    type: "partner_logos", label: "Partner logos", description: "Logos from Content → Partners.", icon: "handshake",
    fields: [eyebrow, heading(), intro],
    defaults: { heading: "Our partners" },
  },
};

export function sectionSummary(type: SectionType, data: Record<string, unknown>): string {
  const h = typeof data.heading === "string" && data.heading ? data.heading : "";
  if (h) return h;
  if (type === "rich_text" && typeof data.body === "string") return data.body.replace(/[#*>\-\n]+/g, " ").trim().slice(0, 80);
  if (type === "video" && typeof data.url === "string") return data.url;
  return SECTIONS[type].description;
}
