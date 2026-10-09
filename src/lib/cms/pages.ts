/** Public URL of a CMS page, from its slug. */
export function pagePublicPath(slug: string) {
  if (slug === "home") return "/";
  if (slug.startsWith("program-")) return `/programs/${slug.slice("program-".length)}`;
  return `/${slug}`;
}

/** Built-in pages that show a list (programs, events…) above their CMS sections. */
export const LISTING_PAGES: Record<string, string> = {
  programs: "The programs list appears above these sections.",
  opportunities: "The searchable opportunities list appears above these sections.",
  events: "Upcoming and past events appear above these sections.",
  contact: "Contact details (from Site settings) and the contact form appear above these sections.",
};

export type PageRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_system: boolean;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  published_at: string | null;
  updated_at: string;
};
