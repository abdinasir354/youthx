import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { loadApplicants } from "@/lib/data/applicants";
import { ApplicantList } from "@/components/partner/applicant-list";
import { QuotaProgress } from "@/components/partner/quota-progress";
import { OppStatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partner");
  return { title: t("applicants"), robots: { index: false } };
}

export default async function ApplicantsPage({ params, searchParams }: PageProps<"/[locale]/partner/opportunities/[id]/applicants">) {
  await requireRole(["partner"], "people");
  const { id } = await params;
  const { status } = (await searchParams) as { status?: string };
  const t = await getTranslations("partner");
  const ta = await getTranslations("appStatus");
  const common = await getTranslations("common");

  const data = await loadApplicants(id);
  if (!data) notFound();
  const { opportunity, seats, applicants } = data;
  const filtered = status ? applicants.filter((a) => a.status === status) : applicants;

  return (
    <div className="space-y-6">
      <PageHeader title={opportunity.title} description={t("applicants")}>
        <OppStatusBadge status={opportunity.status} />
      </PageHeader>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-secondary">{t("quotaProgress")}</h2>
        <QuotaProgress seats={seats} />
      </section>

      <nav aria-label={t("filterStatus")} className="flex flex-wrap gap-2">
        {[undefined, ...APPLICATION_STATUSES].map((s) => {
          const count = s ? applicants.filter((a) => a.status === s).length : applicants.length;
          return (
            <Link
              key={s ?? "all"}
              href={s ? `/partner/opportunities/${id}/applicants?status=${s}` : `/partner/opportunities/${id}/applicants`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                status === s ? "border-secondary bg-secondary text-white" : "border-border bg-white text-secondary hover:bg-muted",
              )}
            >
              {s ? ta(s) : common("all")} ({count})
            </Link>
          );
        })}
      </nav>

      {filtered.length === 0 ? <EmptyState icon={Users} title={t("noApplicants")} /> : <ApplicantList applicants={filtered} questions={opportunity.questions ?? []} />}
    </div>
  );
}
