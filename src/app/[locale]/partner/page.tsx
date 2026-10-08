import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Briefcase, CheckCircle2, FileText, Globe } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getMyOrganization } from "@/lib/data/partner";
import { createClient } from "@/lib/supabase/server";
import { OppStatusBadge } from "@/components/dashboard/status-badge";
import { QuotaProgress } from "@/components/partner/quota-progress";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import type { Opportunity, OpportunitySeats } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partner");
  return { title: t("title"), robots: { index: false } };
}

export default async function PartnerOverview() {
  const user = await requireRole(["partner"], "people");
  const t = await getTranslations("partner");
  const org = await getMyOrganization(user.id);

  if (!org) {
    return (
      <EmptyState title={t("noOrg")} description={t("noOrgText")}>
        <Link href="/partner/organization" className={buttonVariants()}>
          {t("organization")}
        </Link>
      </EmptyState>
    );
  }

  const supabase = await createClient();
  const { data: opps } = await supabase
    .from("opportunities")
    .select("id, title, slug, status, type, capacity")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });
  const list = (opps as Pick<Opportunity, "id" | "title" | "slug" | "status" | "type" | "capacity">[]) ?? [];
  const { data: seatRows } = list.length
    ? await supabase.from("opportunity_seats").select("*").in("opportunity_id", list.map((o) => o.id))
    : { data: [] };
  const seats = new Map(((seatRows as OpportunitySeats[]) ?? []).map((s) => [s.opportunity_id, s]));
  const totals = [...seats.values()].reduce(
    (acc, s) => ({ applicants: acc.applicants + s.female_applied + s.male_applied, accepted: acc.accepted + s.female_accepted + s.male_accepted }),
    { applicants: 0, accepted: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader title={org.name}>
        <Badge variant={org.is_verified ? "secondary" : "warning"}>{org.is_verified ? t("verified") : t("notVerified")}</Badge>
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("stats.opportunities")} value={list.length} icon={Briefcase} />
        <StatCard label={t("stats.published")} value={list.filter((o) => o.status === "published").length} icon={Globe} />
        <StatCard label={t("stats.applicants")} value={totals.applicants} icon={FileText} />
        <StatCard label={t("stats.accepted")} value={totals.accepted} icon={CheckCircle2} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Briefcase} title={t("noOpportunities")} description={t("noOpportunitiesText")}>
          <Link href="/partner/opportunities/new" className={buttonVariants()}>
            {t("newOpportunity")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-secondary">{o.title}</h2>
                  <OppStatusBadge status={o.status} />
                </div>
                <div className="flex gap-2">
                  <Link href={`/partner/opportunities/${o.id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    {t("editOpportunity")}
                  </Link>
                  <Link href={`/partner/opportunities/${o.id}/applicants`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {t("applicants")}
                  </Link>
                </div>
              </div>
              <QuotaProgress seats={seats.get(o.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
