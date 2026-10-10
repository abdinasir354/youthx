import "server-only";
import type { Metadata } from "next";
import { getSettings } from "@/lib/data/cms";

/** The public address. Set NEXT_PUBLIC_SITE_URL to override (e.g. a preview deployment). */
export const PRODUCTION_URL = "https://www.youthupfoundation.org";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL).replace(/\/$/, "");

/**
 * Page metadata with canonical URL, Open Graph and Twitter/X cards. Falls back to the
 * site-wide defaults from Admin → Site settings.
 */
export async function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  absoluteTitle,
  noindex,
}: {
  title?: string | null;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  absoluteTitle?: boolean;
  noindex?: boolean;
}): Promise<Metadata> {
  const s = await getSettings();
  const desc = description || s.seo_description || s.description || undefined;
  const img = image || s.og_image_url || undefined;
  const t = title || s.seo_title || s.site_name;
  return {
    title: absoluteTitle || !title ? { absolute: t } : t,
    description: desc,
    alternates: { canonical: path },
    openGraph: { type, url: path, title: t, description: desc, siteName: s.site_name, images: img ? [{ url: img }] : undefined, locale: "en_US" },
    twitter: { card: img ? "summary_large_image" : "summary", title: t, description: desc, images: img ? [img] : undefined },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}

/** JSON-LD helper: <script type="application/ld+json">. Escapes "<" so content can't break out. */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
