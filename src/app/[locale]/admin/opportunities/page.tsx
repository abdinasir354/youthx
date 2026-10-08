import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, isPastDeadline } from "@/lib/utils";
import { applyRollover, setOpportunityStatus } from "@/app/actions/admin";
import { ActionButton, QuotaEditor } from "@/components/admin/controls";
import { OppStatusBadge } from "@/components/dashboard/status-badge";
import { QuotaProgress } from "@/components/partner/quota-progress";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { OPPORTUNITY_STATUSES, type Opportunity, type OpportunitySeats } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("opportunities"), robots: { index: false } };
}

export default async function AdminOpportunitiesPage({ searchParams }: PageProps<"/[locale]/admin/opportunities">) {
  const me = await requireAdmin("programs");
  const { status } = (await searchParams) as { status?: string };
  const t = await getTranslations("admin");
  const ts = await getTranslations("oppStatus");
  const tt = await getTranslations("types");
  const tp = await getTranslations("partner");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const isAdmin = me.adminRole === "super_admin";

  const supabase = await createClient();
  let q = supabase.from("opportunities").select("*, organization:organizations(id, name, slug, logo_url)").order("updated_at", { ascending: false }).limit(200);
  if (status && (OPPORTUNITY_STATUSES as string[]).includes(status)) q = q.eq("status", status);
  const { data } = await q;
  const opps = (data as Opportunity[]) ?? [];
  const { data: seatRows } = opps.length ? await supabase.from("opportunity_seats").select("*").in("opportunity_id", opps.map((o) => o.id)) : { data: [] };
  const seats = new Map(((seatRows as OpportunitySeats[]) ?? []).map((s) => [s.opportunity_id, s]));

  return (
    <div>
      <PageHeader title={t("opportunities")} />
      <nav className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...OPPORTUNITY_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/opportunities?status=${s}` : "/admin/opportunities"}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", status === s ? "border-secondary bg-secondary text-white" : "border-border bg-white text-secondary hover:bg-muted")}
          >
            {s ? ts(s) : common("all")}
          </Link>
        ))}
      </nav>
      {opps.length === 0 ? (
        <EmptyState title={common("noResults")} />
      ) : (
        <ul className="space-y-3">
          {opps.map((o) => {
            const pastDeadline = isPastDeadline(o.apply_deadline);
            return (
              <li key={o.id} className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-secondary">{o.title}</h2>
                      <OppStatusBadge status={o.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tt(o.type)} · {o.organization?.name ?? "—"} · {tp("fields.deadline")}: {formatDate(o.apply_deadline, locale) || "—"} · {tp("fields.capacity")}: {o.capacity ?? "∞"}
                      {o.rollover_applied && " · ↺"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {o.status === "pending_review" && (
                      <ActionButton action={setOpportunityStatus.bind(null, o.id, "published")} variant="default">{t("approve")}</ActionButton>
                    )}
                    {o.status === "draft" && (
                      <ActionButton action={setOpportunityStatus.bind(null, o.id, "published")}>{t("publish")}</ActionButton>
                    )}
                    {o.status === "published" && (
                      <ActionButton action={setOpportunityStatus.bind(null, o.id, "closed")}>{t("close")}</ActionButton>
                    )}
                    {o.status !== "archived" && o.status !== "draft" && (
                      <ActionButton action={setOpportunityStatus.bind(null, o.id, "draft")} variant="ghost">{t("reopen")}</ActionButton>
                    )}
                    {o.status !== "archived" && (
                      <ActionButton action={setOpportunityStatus.bind(null, o.id, "archived")} variant="ghost">{t("archive")}</ActionButton>
                    )}
                    {isAdmin && o.allow_rollover && !o.rollover_applied && pastDeadline && (
                      <ActionButton action={applyRollover.bind(null, o.id)} successText={t("rolloverDone")}>{t("rollover")}</ActionButton>
                    )}
                    <Link href={`/partner/opportunities/${o.id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>{common("edit")}</Link>
                    <Link href={`/partner/opportunities/${o.id}/applicants`} className={buttonVariants({ variant: "outline", size: "sm" })}>{tp("applicants")}</Link>
                  </div>
                </div>
                <QuotaProgress seats={seats.get(o.id)} />
                <QuotaEditor id={o.id} ratio={Number(o.female_ratio)} allowRollover={o.allow_rollover} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
