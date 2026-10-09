"use client";

import { useState, type ReactNode } from "react";
import {
  BarChart3, BookMarked, BookOpen, Briefcase, Building, Building2, Calendar, ChevronDown, ChevronRight, CircleHelp, ExternalLink,
  FileCheck, FileText, FolderKanban, GraduationCap, HandHeart, Handshake, HeartHandshake, Images, LayoutDashboard,
  Library, LogOut, Mail, Menu, Newspaper, Quote, ScrollText, Search, Send, Settings, UserCog, Users, X,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { ConfirmProvider } from "@/components/admin/ui/feedback";
import type { AdminNavGroup } from "./nav";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, library: Library, "file-text": FileText, "graduation-cap": GraduationCap,
  briefcase: Briefcase, calendar: Calendar, "folder-kanban": FolderKanban, "book-open": BookOpen, quote: Quote,
  "circle-help": CircleHelp, handshake: Handshake, newspaper: Newspaper, "book-marked": BookMarked, "file-check": FileCheck,
  "hand-heart": HandHeart, users: Users, mail: Mail, "building-2": Building2, "heart-handshake": HeartHandshake,
  send: Send, images: Images, menu: Menu, search: Search, settings: Settings, "user-cog": UserCog, building: Building,
  "bar-chart-3": BarChart3, "scroll-text": ScrollText,
};

export function AdminShell({
  nav,
  user,
  children,
}: {
  nav: AdminNavGroup[];
  user: { name: string; email: string | null; roleLabel: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the mobile drawer after navigating (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const under = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isActive = (item: AdminNavGroup["items"][number]) => (item.exact ? pathname === item.href : under(item.href) || (item.match ?? []).some(under));
  const crumbs = breadcrumbs(pathname, nav);

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
        <Logo inverted className="[&_span]:text-base" />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {nav.map((group) => {
          const list = (
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? FileText;
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/6 hover:text-white",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-white/50")} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          );
          if (!group.collapsible) return <div key={group.label || "main"}>{list}</div>;
          return (
            <details key={group.label} open={group.items.some(isActive)} className="group border-t border-white/10 pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-white/60 hover:text-white [&::-webkit-details-marker]:hidden">
                {group.label}
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-1">{list}</div>
            </details>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-white/55">{user.roleLabel}</p>
      </div>
    </nav>
  );

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-[#f6f7f6] lg:pl-64">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-secondary lg:block">{sidebar}</aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-secondary shadow-xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-md p-2 text-secondary hover:bg-muted lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>
          <ol className="flex min-w-0 flex-1 items-center gap-1 text-sm" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                {i < crumbs.length - 1 ? (
                  <Link href={c.href} className="truncate text-muted-foreground hover:text-secondary">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate font-semibold text-secondary" aria-current="page">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-secondary hover:bg-muted sm:flex"
          >
            View site <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-secondary hover:bg-muted" title="Sign out">
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </ConfirmProvider>
  );
}

function breadcrumbs(pathname: string, nav: AdminNavGroup[]) {
  const items = nav.flatMap((g) => g.items);
  const parts = pathname.split("/").filter(Boolean); // ["admin", "programs", "<id>"]
  const out: { href: string; label: string }[] = [{ href: "/admin", label: "Admin" }];
  let href = "";
  for (const p of parts) {
    href += `/${p}`;
    if (href === "/admin") continue;
    const match = items.find((i) => i.href === href);
    const label = match?.label ?? (p === "new" ? "New" : /^[0-9a-f-]{36}$/.test(p) ? "Edit" : p.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()));
    out.push({ href, label });
  }
  return out;
}
