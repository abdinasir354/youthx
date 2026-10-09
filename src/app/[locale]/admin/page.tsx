import type { Metadata } from "next";
import { ArrowRight, Briefcase, Calendar, CheckCircle2, GraduationCap, ImagePlus, LayoutTemplate, Mail, Plus, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { can, type Perm } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { nowIso } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const me = await requireAdmin();
  const role = me.adminRole;
  const supabase = await createClient();
  const now = nowIso();
  const head = { count: "exact" as const, head: true };
  const count = async (perm: Perm, build: () => PromiseLike<{ count: number | null }>) => (can(role, perm) ? ((await build()).count ?? 0) : null);

  const [programs, upcoming, openOpps, unread, pendingOpps, mentorApps, volunteerApps, partnerReqs] = await Promise.all([
    count("programs", () => supabase.from("programs").select("id", head).eq("status", "published")),
    count("programs", () => supabase.from("events").select("id", head).eq("status", "published").gte("starts_at", now)),
    count("programs", () => supabase.from("opportunities").select("id", head).eq("status", "published")),
    count("inbox", () => supabase.from("contact_messages").select("id", head).eq("is_read", false).eq("is_archived", false)),
    count("programs", () => supabase.from("opportunities").select("id", head).eq("status", "pending_review")),
    count("people", () => supabase.from("mentor_applications").select("id", head).eq("status", "new")),
    count("people", () => supabase.from("volunteer_applications").select("id", head).eq("status", "new")),
    count("inbox", () => supabase.from("partner_requests").select("id", head).eq("status", "new")),
  ]);

  const stats = [
    programs != null && { label: "Programs", value: programs, href: "/admin/programs", icon: GraduationCap },
    upcoming != null && { label: "Upcoming events", value: upcoming, href: "/admin/events", icon: Calendar },
    openOpps != null && { label: "Open opportunities", value: openOpps, href: "/admin/opportunities", icon: Briefcase },
    unread != null && { label: "Unread messages", value: unread, href: "/admin/messages", icon: Mail },
  ].filter(Boolean) as { label: string; value: number; href: string; icon: LucideIcon }[];

  const todo = [
    { n: pendingOpps, text: "opportunities submitted by partners to review", href: "/admin/opportunities?status=pending_review" },
    { n: volunteerApps, text: "new volunteer applications", href: "/admin/volunteers?status=new" },
    { n: mentorApps, text: "new mentor applications", href: "/admin/mentorship?status=new" },
    { n: unread, text: "unread contact messages", href: "/admin/messages" },
    { n: partnerReqs, text: "new partner or sponsor requests", href: "/admin/partner-requests" },
  ].filter((t) => (t.n ?? 0) > 0);

  const quick = [
    can(role, "content") && { label: "Edit homepage", href: "/admin/pages", icon: LayoutTemplate },
    can(role, "programs") && { label: "Add event", href: "/admin/events/new", icon: Plus },
    can(role, "programs") && { label: "Add opportunity", href: "/admin/opportunities/new", icon: Plus },
    can(role, "media") && { label: "Upload images", href: "/admin/media", icon: ImagePlus },
  ].filter(Boolean) as { label: string; href: string; icon: LucideIcon }[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-secondary">Welcome{me.profile.full_name ? `, ${me.profile.full_name.split(" ")[0]}` : ""}</h1>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Link key={q.href + q.label} href={q.href} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3.5 text-sm font-medium text-secondary hover:bg-muted">
              <q.icon className="size-4" aria-hidden /> {q.label}
            </Link>
          ))}
        </div>
      </div>

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-lg border border-border bg-white p-5 transition-shadow hover:shadow-md">
            <c.icon className="size-5 text-secondary/50" aria-hidden />
            <p className="mt-3 text-3xl font-bold tabular-nums text-secondary">{c.value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-white">
          <h2 className="border-b border-border px-5 py-3 text-sm font-bold text-secondary">Needs your attention</h2>
          {todo.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="size-5 text-secondary" aria-hidden /> You&rsquo;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {todo.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/50">
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-secondary">{t.n}</span>
                    <span className="flex-1 text-secondary">{t.text}</span>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <RecentActivity superAdmin={role === "super_admin"} />
      </div>
    </div>
  );
}

const VERBS: Record<string, string> = {
  create: "added", update: "edited", delete: "deleted", publish: "published", unpublish: "unpublished",
  status_change: "changed the status of", review: "reviewed", settings_change: "updated", opportunity_status: "changed the status of",
};
const THINGS: Record<string, string> = {
  programs: "program", events: "event", opportunities: "opportunity", projects: "project", resources: "resource", stories: "story",
  pages: "page", page_sections: "a page section", navigation_items: "a menu link", media: "a file", faqs: "an FAQ", partners: "a partner logo",
  program_categories: "a program category", resource_categories: "a resource category", site_settings: "the site settings",
  volunteer_applications: "a volunteer application", mentor_applications: "a mentor application", application: "an application",
};
const EDIT_PATH: Record<string, string> = {
  programs: "/admin/programs", events: "/admin/events", opportunities: "/admin/opportunities", projects: "/admin/projects",
  resources: "/admin/resources", stories: "/admin/stories", pages: "/admin/pages",
};

async function RecentActivity({ superAdmin }: { superAdmin: boolean }) {
  const supabase = await createClient();
  type Item = { key: string; text: string; at: string; href?: string };
  let items: Item[] = [];

  if (superAdmin) {
    const { data } = await supabase
      .from("audit_log")
      .select("id, actor_id, action, entity, entity_id, details, created_at")
      .not("action", "in", "(login,logout,export,accept_attempt)")
      .order("created_at", { ascending: false })
      .limit(8);
    const actorIds = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
    const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] };
    const names = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email || "Someone"]));
    items = (data ?? []).map((a) => {
      const d = (a.details ?? {}) as Record<string, unknown>;
      const who = a.actor_id ? names.get(a.actor_id) ?? "Someone" : "The system";
      const verb = VERBS[a.action] ?? a.action.replace(/_/g, " ");
      const base = THINGS[a.entity ?? ""] ?? (a.entity ?? "").replace(/_/g, " ");
      const named = typeof d.title === "string" && !base.startsWith("a ") && !base.startsWith("the ") ? `${base} “${d.title}”` : base;
      return {
        key: String(a.id),
        text: `${who} ${verb} ${named}`,
        at: a.created_at,
        href: a.entity && EDIT_PATH[a.entity] && a.entity_id && a.action !== "delete" ? `${EDIT_PATH[a.entity]}/${a.entity_id}` : undefined,
      };
    });
  } else {
    const tables = ["programs", "events", "opportunities", "pages"] as const;
    const results = await Promise.all(tables.map((t) => supabase.from(t).select("id, title, updated_at").order("updated_at", { ascending: false }).limit(4)));
    items = results
      .flatMap((r, i) => (r.data ?? []).map((row) => ({ key: `${tables[i]}-${row.id}`, text: `${THINGS[tables[i]]} “${row.title}”`, at: String(row.updated_at), href: `${EDIT_PATH[tables[i]]}/${row.id}` })))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
  }

  return (
    <section className="rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-bold text-secondary">{superAdmin ? "Recent activity" : "Recently updated"}</h2>
        {superAdmin && <Link href="/admin/audit" className="text-xs font-medium text-secondary underline">Audit log</Link>}
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => {
            const inner = (
              <>
                <span className="min-w-0 flex-1 truncate text-sm text-secondary first-letter:uppercase">{it.text}</span>
                <time dateTime={it.at} className="shrink-0 text-xs text-muted-foreground">
                  {new Date(it.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Mogadishu" })}
                </time>
              </>
            );
            return (
              <li key={it.key}>
                {it.href ? <Link href={it.href} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">{inner}</Link> : <div className="flex items-center gap-3 px-5 py-3">{inner}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
