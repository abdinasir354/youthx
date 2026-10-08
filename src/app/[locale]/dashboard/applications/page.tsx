import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, Circle, FileText, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate } from "@/lib/utils";
import { AppStatusBadge } from "@/components/dashboard/status-badge";
import { WithdrawButton } from "@/components/dashboard/withdraw-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { ApplicationStatus, OpportunityType } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("applications"), robots: { index: false } };
}

type Row = {
  id: string;
  status: ApplicationStatus;
  submitted_at: string;
  decided_at: string | null;
  opportunity: { title: string; slug: string; type: OpportunityType; organization: { name: string } | null } | null;
};

// The happy path every application walks through; rejected/waitlisted/withdrawn branch off it.
const PATH: ApplicationStatus[] = ["submitted", "under_review", "shortlisted", "accepted"];

export default async function ApplicationsPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const ta = await getTranslations("appStatus");
  const tt = await getTranslations("types");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, submitted_at, decided_at, opportunity:opportunities(title, slug, type, organization:organizations(name))")
    .eq("applicant_id", user.id)
    .order("submitted_at", { ascending: false });
  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div>
      <PageHeader title={t("applications")} />
      {rows.length === 0 ? (
        <EmptyState icon={FileText} title={t("noApplications")} description={t("noApplicationsText")}>
          <Link href="/opportunities" className={buttonVariants()}>
            {t("browse")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map((a) => {
            const reached = PATH.indexOf(a.status);
            const offPath = reached === -1;
            return (
              <li key={a.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {a.opportunity && <Badge variant="outline">{tt(a.opportunity.type)}</Badge>}
                    <h2 className="mt-1 text-lg font-bold text-secondary">
                      <Link href={`/opportunities/${a.opportunity?.slug}`} className="hover:underline">
                        {a.opportunity?.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">{a.opportunity?.organization?.name}</p>
                  </div>
                  <AppStatusBadge status={a.status} />
                </div>

                {/* status timeline */}
                <ol className="mt-5 grid grid-cols-4 gap-2" aria-label={t("timeline")}>
                  {PATH.map((step, i) => {
                    const done = !offPath && i <= reached;
                    return (
                      <li key={step} className="flex flex-col items-center gap-1 text-center">
                        {done ? <CheckCircle2 className="size-5 text-secondary" /> : <Circle className="size-5 text-border" />}
                        <span className={cn("text-[11px] leading-tight", done ? "font-semibold text-secondary" : "text-muted-foreground")}>{ta(step)}</span>
                      </li>
                    );
                  })}
                </ol>
                {offPath && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-secondary">
                    <XCircle className="size-4" /> {ta(a.status)}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {t("appliedOn", { date: formatDate(a.submitted_at, locale) })}
                    {a.decided_at && ` · ${t("decidedOn", { date: formatDate(a.decided_at, locale) })}`}
                  </span>
                  {["submitted", "under_review", "shortlisted", "waitlisted"].includes(a.status) && <WithdrawButton id={a.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
