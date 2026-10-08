import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { getMyOrganization } from "@/lib/data/partner";
import { OrganizationForm } from "@/components/partner/organization-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partner");
  return { title: t("organization"), robots: { index: false } };
}

export default async function OrganizationPage() {
  const user = await requireRole(["partner"], "people");
  const t = await getTranslations("partner");
  const org = await getMyOrganization(user.id);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("organization")} description={org ? undefined : t("noOrgText")}>
        {org && <Badge variant={org.is_verified ? "secondary" : "warning"}>{org.is_verified ? t("verified") : t("notVerified")}</Badge>}
      </PageHeader>
      <OrganizationForm org={org} userId={user.id} />
    </div>
  );
}
