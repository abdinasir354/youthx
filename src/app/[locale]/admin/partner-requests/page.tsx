import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Handshake } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { setPartnerRequestStatus } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { PartnerRequest } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("partnerRequests"), robots: { index: false } };
}

export default async function AdminPartnerRequestsPage() {
  await requireAdmin("inbox");
  const t = await getTranslations("admin");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.from("partner_requests").select("*").order("created_at", { ascending: false }).limit(300);
  const requests = (data as PartnerRequest[]) ?? [];
  const label = { new: t("statusNew"), contacted: t("contacted"), approved: t("approved"), declined: t("declined") } as const;

  return (
    <div className="max-w-4xl">
      <PageHeader title={t("partnerRequests")} />
      {requests.length === 0 ? (
        <EmptyState icon={Handshake} title={common("noResults")} />
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-secondary">{r.org_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.contact_name} · <a href={`mailto:${r.email}`} className="underline">{r.email}</a>
                    {r.phone && <> · {r.phone}</>} · {formatDate(r.created_at, locale)}
                  </p>
                </div>
                <Badge variant={r.status === "approved" ? "secondary" : r.status === "declined" ? "danger" : r.status === "new" ? "warning" : "outline"}>
                  {label[r.status]}
                </Badge>
              </div>
              {r.message && <p className="mt-3 whitespace-pre-line text-sm">{r.message}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {(["contacted", "approved", "declined"] as const)
                  .filter((s) => s !== r.status)
                  .map((s) => (
                    <ActionButton key={s} action={setPartnerRequestStatus.bind(null, r.id, s)} variant={s === "approved" ? "default" : "ghost"}>
                      {label[s]}
                    </ActionButton>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
