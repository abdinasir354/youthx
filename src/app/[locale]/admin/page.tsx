import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Briefcase, CheckCircle2, FileText, Handshake, Mail, Percent, UserRound, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminOverview() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [users, youth, pendingOpps, apps, accepted, acceptedWomen, unread, newRequests] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true })),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "youth")),
    count(supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "pending_review")),
    count(supabase.from("applications").select("id", { count: "exact", head: true })),
    count(supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "accepted")),
    count(supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "accepted").eq("gender_snapshot", "female")),
    count(supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false)),
    count(supabase.from("partner_requests").select("id", { count: "exact", head: true }).eq("status", "new")),
  ]);

  const cards = [
    { label: t("stats.users"), value: users, icon: Users, href: "/admin/users" },
    { label: t("stats.youth"), value: youth, icon: UserRound, href: "/admin/users" },
    { label: t("stats.pendingOpps"), value: pendingOpps, icon: Briefcase, href: "/admin/opportunities?status=pending_review" },
    { label: t("stats.applications"), value: apps, icon: FileText, href: "/admin/applications" },
    { label: t("stats.accepted"), value: accepted, icon: CheckCircle2, href: "/admin/applications?status=accepted" },
    { label: t("stats.womenPercent"), value: accepted ? `${Math.round((acceptedWomen / accepted) * 100)}%` : "—", icon: Percent, href: "/admin/reports" },
    { label: t("stats.unreadMessages"), value: unread, icon: Mail, href: "/admin/messages" },
    { label: t("stats.newPartnerRequests"), value: newRequests, icon: Handshake, href: "/admin/partner-requests" },
  ];

  return (
    <div>
      <PageHeader title={t("title")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl transition-transform hover:-translate-y-0.5">
            <StatCard label={c.label} value={c.value} icon={c.icon} />
          </Link>
        ))}
      </div>
    </div>
  );
}
