"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/types/cms";
import { LanguageSwitcher } from "./language-switcher";

const isExternal = (href: string) => /^(https?:|mailto:)/i.test(href);

function NavAnchor({ link, className, active, onClick }: { link: NavLink; className: string; active: boolean; onClick?: () => void }) {
  if (isExternal(link.href)) {
    return (
      <a href={link.href} className={className} onClick={onClick} {...(link.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} aria-current={active ? "page" : undefined} onClick={onClick} {...(link.open_in_new_tab ? { target: "_blank" } : {})}>
      {link.label}
    </Link>
  );
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
}

/** Desktop navigation. The active state needs the URL, so it streams in. */
export function HeaderNav({ links, className }: { links: NavLink[]; className?: string }) {
  const render = (isActive: (href: string) => boolean) => (
    <nav aria-label="Main" className={cn("items-center gap-0.5", className)}>
      {links.map((l) => (
        <NavAnchor
          key={l.id}
          link={l}
          active={isActive(l.href)}
          className={cn(
            "relative rounded-md px-4 py-2 text-[17px] font-semibold tracking-[-0.01em] antialiased transition-colors",
            isActive(l.href) ? "text-secondary after:absolute after:inset-x-4 after:-bottom-[13px] after:h-[3px] after:rounded-full after:bg-primary lg:after:-bottom-[14px]" : "text-ink/85 hover:text-secondary",
          )}
        />
      ))}
    </nav>
  );
  return <Suspense fallback={render(() => false)}><ActiveNav render={render} /></Suspense>;
}

function ActiveNav({ render }: { render: (isActive: (href: string) => boolean) => React.ReactNode }) {
  const isActive = useActive();
  return <>{render(isActive)}</>;
}

/** Mobile menu: a disclosure button + panel. Esc closes; focus returns to the button. */
export function MobileMenu({ links, cta }: { links: NavLink[]; cta: { label: string; href: string } }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("closeMenu") : t("menu")}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <div id="mobile-menu" ref={panel} className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-border bg-white">
          <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6">
            <Suspense fallback={null}>
              <MobileLinks links={links} onNavigate={() => setOpen(false)} />
            </Suspense>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <Link href={cta.href} onClick={() => setOpen(false)} className={buttonVariants({ size: "lg", className: "w-full" })}>
                {cta.label}
              </Link>
            </div>
            <LanguageSwitcher className="mt-4 self-start" />
          </nav>
        </div>
      )}
    </div>
  );
}

function MobileLinks({ links, onNavigate }: { links: NavLink[]; onNavigate: () => void }) {
  const isActive = useActive();
  return (
    <>
      {links.map((l) => (
        <NavAnchor
          key={l.id}
          link={l}
          active={isActive(l.href)}
          onClick={onNavigate}
          className={cn("border-b border-border py-3.5 text-lg font-semibold", isActive(l.href) ? "text-secondary" : "text-secondary/80")}
        />
      ))}
    </>
  );
}
