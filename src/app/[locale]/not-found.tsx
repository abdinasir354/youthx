import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <span className="rounded-full bg-primary-soft p-4 text-secondary">
          <Compass className="size-10" />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-extrabold text-secondary">{t("notFoundTitle")}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{t("notFoundText")}</p>
        <Link href="/" className={buttonVariants({ className: "mt-8" })}>
          {t("goHome")}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
