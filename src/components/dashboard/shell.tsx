import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { PageSkeleton } from "@/components/ui/misc";
import { NavLink } from "./nav-link";

export type ShellNavItem = { href: string; label: string; icon: ReactNode; exact?: boolean };

/**
 * Static shell (header + sidebar) that prerenders; `gate` reads the session and streams in.
 * The role check runs inside Suspense, as Cache Components requires for cookie reads.
 */
export function DashboardShell({ title, nav, gate }: { title: string; nav: ShellNavItem[]; gate: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:py-10">
        <aside className="lg:w-60 lg:shrink-0">
          <p className="mb-3 hidden px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground lg:block">{title}</p>
          <nav aria-label={title} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact} icon={item.icon}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main id="main" className="min-w-0 flex-1">
          <Suspense fallback={<PageSkeleton />}>{gate}</Suspense>
        </main>
      </div>
    </>
  );
}
