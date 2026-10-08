import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { setDonationStatus } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, StatCard, Table, Td, Th } from "@/components/ui/misc";
import type { Donation } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("donations"), robots: { index: false } };
}

export default async function AdminDonationsPage() {
  await requireAdmin("inbox");
  const t = await getTranslations("admin");
  const td = await getTranslations("donate");
  const tm = await getTranslations("methods");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.from("donations").select("*").order("created_at", { ascending: false }).limit(500);
  const donations = (data as Donation[]) ?? [];
  const sum = (status: string) => donations.filter((d) => d.status === status && d.currency === "USD").reduce((a, d) => a + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("donations")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label={`${t("totalConfirmed")} (USD)`} value={`$${sum("confirmed").toLocaleString("en-US")}`} />
        <StatCard label={`${t("totalPledged")} (USD)`} value={`$${sum("pledged").toLocaleString("en-US")}`} />
      </div>
      {donations.length === 0 ? (
        <EmptyState title={common("noResults")} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{common("name")}</Th>
              <Th>{td("amount")}</Th>
              <Th>{td("method")}</Th>
              <Th>{td("reference")}</Th>
              <Th>{common("status")}</Th>
              <Th>{common("actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id}>
                <Td>
                  <p className="font-semibold text-secondary">{d.donor_name || "—"} {d.is_anonymous && <Badge variant="outline">{t("anonymous")}</Badge>}</p>
                  <p className="text-xs text-muted-foreground">{[d.donor_phone, d.donor_email].filter(Boolean).join(" · ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(d.created_at, locale)}</p>
                  {d.message && <p className="mt-1 text-xs italic">“{d.message}”</p>}
                </Td>
                <Td className="whitespace-nowrap font-semibold">{Number(d.amount).toLocaleString("en-US")} {d.currency}</Td>
                <Td>{d.method ? tm(d.method as "evc_plus") : "—"}</Td>
                <Td className="font-mono text-xs">{d.reference}</Td>
                <Td>
                  <Badge variant={d.status === "confirmed" ? "secondary" : d.status === "cancelled" ? "danger" : "warning"}>{t(`donationStatus.${d.status}`)}</Badge>
                </Td>
                <Td>
                  {d.status === "pledged" && (
                    <div className="flex gap-1">
                      <ActionButton action={setDonationStatus.bind(null, d.id, "confirmed")} variant="default">{t("confirm")}</ActionButton>
                      <ActionButton action={setDonationStatus.bind(null, d.id, "cancelled")} variant="ghost">{t("cancelDonation")}</ActionButton>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
