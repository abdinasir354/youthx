import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getNavigation, getSettings } from "@/lib/data/cms";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { HeaderNav, MobileMenu } from "./header-nav";
import { LanguageSwitcher } from "./language-switcher";

/**
 * Public header: logo, the menu from Admin → Navigation, and one call-to-action button
 * from Admin → Site settings. There are no visitor accounts, so no log-in links.
 */
export async function SiteHeader() {
  const [links, settings, t] = await Promise.all([getNavigation("header"), getSettings(), getTranslations("nav")]);
  const cta = { label: settings.header_cta_label, href: settings.header_cta_href };
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/90 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-secondary">
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:grid lg:h-[4.5rem] lg:grid-cols-[1fr_auto_1fr]">
        <div className="lg:justify-self-start">
          <Logo preload />
        </div>
        <HeaderNav links={links} className="hidden lg:flex" />
        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:justify-self-end">
          <LanguageSwitcher className="hidden sm:flex" />
          <Link href={cta.href} className={cn(buttonVariants({ size: "sm" }), "hidden h-10 rounded-full px-5 transition duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-md sm:inline-flex")}>
            {cta.label}
          </Link>
          <MobileMenu links={links} cta={cta} />
        </div>
      </div>
    </header>
  );
}
