import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// The hidden admin sign-in page is deliberately NOT listed here (that would reveal it);
// it carries its own noindex tag instead.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/preview", "/auth/", "/newsletter/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
