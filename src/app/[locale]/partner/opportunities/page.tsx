import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Briefcase, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getMyOrganization } from "@/lib/data/partner";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { OppStatusBadge } from "@/components/dashboard/status-badge";
import { CloseOpportunityButton } from "@/components/partner/review-actions";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import type { Opportunity } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partner");
  return { title: t("opportunities"), robots: { index: false } };
}

export default async function PartnerOpportunitiesPage() {
  const user = await requireRole(["partner"], "people");
  const t = await getTranslations("partner");
  const tt = await getTranslations("types");
  const tf = await getTranslations("partner.fields");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const org = await getMyOrganization(user.id);
  const supabase = await createClient();
  const { data } = org
    ? await supabase.from("opportunities").select("*").eq("organization_id", org.id).order("created_at", { ascending: false })
    : { data: [] };
  const opps = (data as Opportunity[]) ?? [];

  return (
    <div>
      <PageHeader title={t("opportunities")}>
        <Link href="/partner/opportunities/new" className={buttonVariants()}>
          <Plus /> {t("newOpportunity")}
        </Link>
      </PageHeader>
      {opps.length === 0 ? (
        <EmptyState icon={Briefcase} title={t("noOpportunities")} description={t("noOpportunitiesText")} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{tf("title")}</Th>
              <Th>{common("type")}</Th>
              <Th>{common("status")}</Th>
              <Th>{tf("capacity")}</Th>
              <Th>{tf("deadline")}</Th>
              <Th>{common("actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {opps.map((o) => (
              <tr key={o.id}>
                <Td className="font-semibold text-secondary">{o.title}</Td>
                <Td>{tt(o.type)}</Td>
                <Td><OppStatusBadge status={o.status} /></Td>
                <Td>{o.capacity ?? "∞"}</Td>
                <Td>{formatDate(o.apply_deadline, locale) || "—"}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Link href={`/partner/opportunities/${o.id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>{common("edit")}</Link>
                    <Link href={`/partner/opportunities/${o.id}/applicants`} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("applicants")}</Link>
                    {o.status === "published" && <CloseOpportunityButton id={o.id} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
