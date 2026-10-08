import { useTranslations } from "next-intl";
import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { CurrentYear } from "./current-year";

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  return (
    <footer className="mt-auto bg-secondary text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo inverted />
          <p className="text-sm leading-relaxed text-white/75">{t("about")}</p>
          <LanguageSwitcher inverted />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{t("quickLinks")}</h2>
          <ul className="space-y-2 text-sm text-white/80">
            {(["opportunities", "programs", "courses", "stories", "news"] as const).map((k) => (
              <li key={k}>
                <Link href={`/${k}`} className="hover:text-primary">
                  {nav(k)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{t("getInvolved")}</h2>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link href="/partners#become" className="hover:text-primary">{t("becomePartner")}</Link></li>
            <li><Link href="/contact" className="hover:text-primary">{t("becomeMentor")}</Link></li>
            <li><Link href="/donate" className="hover:text-primary">{nav("donate")}</Link></li>
            <li><Link href="/about" className="hover:text-primary">{nav("about")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{t("contactUs")}</h2>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{t("address")}</li>
            <li className="flex items-center gap-2"><Phone className="size-4 text-primary" /><a href="tel:+252610000000" className="hover:text-primary">+252 61 000 0000</a></li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-primary" /><a href="mailto:info@youthup.so" className="hover:text-primary">info@youthup.so</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">
        <CurrentYear />
      </div>
    </footer>
  );
}
