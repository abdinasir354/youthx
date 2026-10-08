"use client";

import { Suspense, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = { href: string; exact?: boolean; icon: ReactNode; children: ReactNode };

/** The active state needs the URL (runtime data) → render an inactive link until it streams in. */
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Item {...props} active={false} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  );
}

function ActiveNavLink(props: Props) {
  const pathname = usePathname();
  const active = props.exact ? pathname === props.href : pathname === props.href || pathname.startsWith(props.href + "/");
  return <Item {...props} active={active} />;
}

function Item({ href, icon, children, active }: Props & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors [&_svg]:size-4",
        active ? "bg-secondary text-white [&_svg]:text-primary" : "text-secondary/80 hover:bg-muted hover:text-secondary",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
