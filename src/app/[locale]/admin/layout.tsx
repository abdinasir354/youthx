import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_ROLE_LABELS, can } from "@/lib/permissions";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { ADMIN_NAV } from "@/components/admin/shell/nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · YouthX Admin" },
  robots: { index: false, follow: false },
};

/**
 * Back office. The proxy already 404s anyone without an admin role; requireAdmin() checks again
 * on the server, every page checks its own permission, and RLS checks every query.
 */
export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const nav = ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items
      .filter((i) => !i.perm || can(me.adminRole, i.perm))
      // Content admins manage navigation + SEO but not site settings.
      .map((i) => (i.href === "/admin/settings" && !can(me.adminRole, "settings") ? { ...i, href: "/admin/navigation" } : i)),
  })).filter((g) => g.items.length);
  return (
    <AdminShell
      nav={nav}
      user={{ name: me.profile.full_name || me.email || "Admin", email: me.email, roleLabel: ADMIN_ROLE_LABELS[me.adminRole] }}
    >
      {children}
    </AdminShell>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-[#f6f7f6] lg:pl-64" aria-busy="true">
      <div className="fixed inset-y-0 left-0 hidden w-64 bg-secondary lg:block" />
      <div className="h-16 border-b border-border bg-white" />
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-white" />
      </div>
    </div>
  );
}
