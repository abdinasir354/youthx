import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { setOrgVerified } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import type { Organization } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("organizations"), robots: { index: false } };
}

export default async function AdminOrganizationsPage() {
  await requireAdmin("people");
  const t = await getTranslations("admin");
  const tp = await getTranslations("partner");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("*").order("is_verified").order("created_at", { ascending: false });
  const orgs = (data as Organization[]) ?? [];

  return (
    <div>
      <PageHeader title={t("organizations")} />
      {orgs.length === 0 ? (
        <EmptyState title={common("noResults")} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{common("name")}</Th>
              <Th>{common("type")}</Th>
              <Th>{common("status")}</Th>
              <Th>{t("joined")}</Th>
              <Th>{common("actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id}>
                <Td>
                  <p className="font-semibold text-secondary">{o.name}</p>
                  {o.website && <a href={o.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline">{o.website}</a>}
                </Td>
                <Td>{o.type ? tp(`orgTypes.${o.type}` as "orgTypes.ngo") : "—"}</Td>
                <Td><Badge variant={o.is_verified ? "secondary" : "warning"}>{o.is_verified ? tp("verified") : tp("notVerified")}</Badge></Td>
                <Td>{formatDate(o.created_at, locale)}</Td>
                <Td>
                  <ActionButton action={setOrgVerified.bind(null, o.id, !o.is_verified)} variant={o.is_verified ? "ghost" : "default"}>
                    {o.is_verified ? t("unverify") : t("verify")}
                  </ActionButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
