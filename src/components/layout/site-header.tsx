import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LayoutDashboard, LogOut, Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationBell } from "./notification-bell";

/** Main navigation: exactly these six items, in this order. */
const NAV = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/programs", key: "programs" },
  { href: "/opportunities", key: "opportunities" },
  { href: "/events", key: "events" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2">
        {t("home")}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Logo preload />
        <nav className="ml-4 hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-secondary/80 hover:bg-muted hover:text-secondary">
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
          <Suspense fallback={<div className="h-9 w-24 animate-pulse rounded-xl bg-muted" />}>
            <AccountArea />
          </Suspense>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

/** Reads the session → streams in behind Suspense so the rest of the header stays static. */
async function AccountArea() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
          {t("login")}
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          {t("signup")}
        </Link>
      </div>
    );
  }
  const role = user.profile.role;
  const area =
    user.adminRole ? { href: "/admin", label: t("admin") }
    : role === "partner" ? { href: "/partner", label: t("partnerArea") }
    : role === "mentor" ? { href: "/mentor", label: t("mentorArea") }
    : null;
  return (
    <div className="flex items-center gap-1">
      <NotificationBell userId={user.id} />
      {area && (
        <Link href={area.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden md:inline-flex")}>
          {area.label}
        </Link>
      )}
      <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
        <LayoutDashboard />
        <span className="hidden sm:inline">{t("dashboard")}</span>
      </Link>
      <form action={logout}>
        <button type="submit" className={buttonVariants({ variant: "ghost", size: "icon" })} title={t("logout")} aria-label={t("logout")}>
          <LogOut />
        </button>
      </form>
    </div>
  );
}

/** No-JS mobile menu using <details>. */
function MobileMenu() {
  const t = useTranslations("nav");
  return (
    <details className="group relative lg:hidden">
      <summary className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "cursor-pointer list-none [&::-webkit-details-marker]:hidden")} aria-label={t("menu")}>
        <Menu />
      </summary>
      <div className="absolute right-0 top-12 w-64 rounded-2xl border border-border bg-white p-2 shadow-xl">
        <nav className="flex flex-col" aria-label="Mobile">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-muted">
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-2 border-t border-border p-2">
          <LanguageSwitcher />
        </div>
      </div>
    </details>
  );
}
