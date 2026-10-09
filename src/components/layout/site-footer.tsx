import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";
import { getNavigation, getSettings } from "@/lib/data/cms";
import { SOCIAL_LABELS, SOCIAL_NETWORKS } from "@/lib/cms/settings";
import { SmartLink } from "@/components/site/basics";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { CookieSettingsButton } from "./cookie-consent";
import { Logo } from "./logo";
import { CurrentYear } from "./current-year";

/** Footer: everything here comes from Admin → Site settings and Navigation. Empty details are hidden. */
export async function SiteFooter() {
  const [settings, links, legal, t] = await Promise.all([getSettings(), getNavigation("footer"), getNavigation("legal"), getTranslations("footer")]);
  const socials = SOCIAL_NETWORKS.filter((n) => settings.social?.[n]);
  const hasContact = settings.contact_email || settings.contact_phone || settings.address;

  return (
    <footer className="mt-auto bg-secondary text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:gap-6">
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Logo inverted />
          {settings.footer_text && <p className="max-w-xs text-sm leading-relaxed text-white/75">{settings.footer_text}</p>}
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t("social")}>
              {socials.map((n) => (
                <li key={n}>
                  <a href={settings.social[n]} target="_blank" rel="noopener noreferrer me" className="inline-flex rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white/85 hover:border-primary hover:text-primary">
                    {SOCIAL_LABELS[n]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {links.length > 0 && (
          <nav aria-labelledby="footer-links">
            <h2 id="footer-links" className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">{t("explore")}</h2>
            <ul className="space-y-2.5 text-sm text-white/80">
              {links.map((l) => (
                <li key={l.id}>
                  <SmartLink href={l.href} newTab={l.open_in_new_tab} className="hover:text-primary">
                    {l.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {hasContact && (
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">{t("connect")}</h2>
            <ul className="space-y-3 text-sm text-white/80">
              {settings.contact_email && (
                <li className="flex gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <a href={`mailto:${settings.contact_email}`} className="break-all hover:text-primary">{settings.contact_email}</a>
                </li>
              )}
              {settings.contact_phone && (
                <li className="flex gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <a href={`tel:${settings.contact_phone.replace(/\s/g, "")}`} className="hover:text-primary">{settings.contact_phone}</a>
                </li>
              )}
              {settings.address && (
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span className="whitespace-pre-line">{settings.address}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {legal.length > 0 && (
          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">{t("legal")}</h2>
            <ul className="space-y-2.5 text-sm text-white/80">
              {legal.map((l) => (
                <li key={l.id}>
                  <SmartLink href={l.href} className="hover:text-primary">{l.label}</SmartLink>
                </li>
              ))}
              <li>
                <CookieSettingsButton className="text-left hover:text-primary">{t("cookieSettings")}</CookieSettingsButton>
              </li>
            </ul>
          </nav>
        )}

        {settings.newsletter_enabled && (
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">{t("newsletterTitle")}</h2>
            <p className="mb-4 text-sm leading-relaxed text-white/75">{t("newsletterText")}</p>
            <NewsletterForm />
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © <CurrentYear /> {settings.site_name}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
