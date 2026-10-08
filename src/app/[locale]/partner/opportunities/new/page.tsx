import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getMyOrganization } from "@/lib/data/partner";
import { OpportunityForm } from "@/components/partner/opportunity-form";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partner");
  return { title: t("newOpportunity"), robots: { index: false } };
}

export default async function NewOpportunityPage() {
  const user = await requireRole(["partner"], "people");
  const t = await getTranslations("partner");
  const org = await getMyOrganization(user.id);
  if (!org)
    return (
      <EmptyState title={t("noOrg")} description={t("noOrgText")}>
        <Link href="/partner/organization" className={buttonVariants()}>
          {t("organization")}
        </Link>
      </EmptyState>
    );
  return (
    <div className="max-w-4xl">
      <PageHeader title={t("newOpportunity")} description={t("noOpportunitiesText")} />
      <OpportunityForm />
    </div>
  );
}
