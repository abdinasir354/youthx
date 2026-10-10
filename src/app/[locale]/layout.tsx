import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getSettings } from "@/lib/data/cms";
import { jsonLd } from "@/lib/seo";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { RevealObserver } from "@/components/layout/reveal-observer";
import "../globals.css";

// Inter: very legible at small sizes, and bold/tight enough for big headlines.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: s.seo_title || s.site_name, template: `%s · ${s.site_name}` },
    description: s.seo_description || s.description || undefined,
    applicationName: s.site_name,
    openGraph: {
      type: "website",
      siteName: s.site_name,
      locale: locale === "so" ? "so_SO" : "en_US",
      description: s.seo_description || s.description || undefined,
      images: s.og_image_url ? [{ url: s.og_image_url }] : undefined,
    },
  };
}

/** schema.org Organization — only real details from Site settings. */
async function OrganizationJsonLd() {
  const s = await getSettings();
  const sameAs = Object.values(s.social ?? {}).filter(Boolean);
  const data = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: s.site_name,
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    description: s.description ?? undefined,
    slogan: s.tagline ?? undefined,
    email: s.contact_email ?? undefined,
    telephone: s.contact_phone ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />;
}

export const viewport: Viewport = {
  themeColor: "#1c4b40",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <OrganizationJsonLd />
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <RevealObserver />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
