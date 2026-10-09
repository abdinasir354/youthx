/** Social networks an admin can link from the footer and contact page. */
export const SOCIAL_NETWORKS = ["facebook", "x", "instagram", "linkedin", "youtube", "tiktok"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  x: "X (Twitter)",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export type SiteSettings = {
  site_name: string;
  tagline: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  social: Partial<Record<SocialNetwork, string>>;
  header_cta_label: string;
  header_cta_href: string;
  footer_text: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  newsletter_enabled: boolean;
  updated_at?: string;
};

/** Used when the settings row can't be read (e.g. database not set up yet). Real values only. */
export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "Youthup Foundation",
  tagline: "Empowering Somali Youth. Building a Better Future.",
  description:
    "Youthup Foundation empowers Somali youth to learn, grow, connect, and lead through education, practical skills, mentorship, career development, entrepreneurship, and community initiatives.",
  contact_email: null,
  contact_phone: null,
  address: null,
  social: {},
  header_cta_label: "Contact us",
  header_cta_href: "/contact",
  footer_text: "Empowering Somali Youth. Building a Better Future.",
  seo_title: "Youthup Foundation — Empowering Somali Youth",
  seo_description: null,
  og_image_url: null,
  newsletter_enabled: true,
};
