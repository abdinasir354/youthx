import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageFromDob, ageGroup } from "@/lib/utils";
import { exportApplicationsCsv, exportUsersCsv } from "@/app/actions/admin";
import { CsvButton } from "@/components/admin/controls";
import { BarReport, GenderReport, WomenShareReport } from "@/components/admin/report-charts";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { ApplicationStatus, Gender, OpportunityType } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("reports.title"), robots: { index: false } };
}

type Row = {
  status: ApplicationStatus;
  gender_snapshot: Gender;
  opportunity: { id: string; title: string; type: OpportunityType } | null;
  applicant: { region: string | null; date_of_birth: string | null } | null;
};

function countBy<T>(rows: T[], key: (r: T) => string) {
  const map = new Map<string, number>();
  for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + 1);
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export default async function ReportsPage() {
  await requireAdmin("people");
  const t = await getTranslations("admin.reports");
  const tt = await getTranslations("types");
  const common = await getTranslations("common");
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("status, gender_snapshot, opportunity:opportunities(id, title, type), applicant:profiles!applications_applicant_id_fkey(region, date_of_birth)")
    .neq("status", "withdrawn")
    .limit(20000);
  const rows = (data as unknown as Row[]) ?? [];
  const now = new Date();
  const accepted = rows.filter((r) => r.status === "accepted");

  const gender = [
    { label: t("applicants"), women: rows.filter((r) => r.gender_snapshot === "female").length, men: rows.filter((r) => r.gender_snapshot === "male").length },
    { label: t("acceptances"), women: accepted.filter((r) => r.gender_snapshot === "female").length, men: accepted.filter((r) => r.gender_snapshot === "male").length },
  ];
  const byRegion = countBy(rows, (r) => r.applicant?.region ?? "—");
  const ageOrder = ["15-17", "18-24", "25-29", "30-35", "unknown"];
  const byAge = countBy(rows, (r) => ageGroup(ageFromDob(r.applicant?.date_of_birth, now))).sort((a, b) => ageOrder.indexOf(a.label) - ageOrder.indexOf(b.label));
  const byProgram = countBy(rows, (r) => (r.opportunity ? tt(r.opportunity.type) : "—"));

  const perOpp = new Map<string, { label: string; women: number; total: number }>();
  for (const r of accepted) {
    if (!r.opportunity) continue;
    const e = perOpp.get(r.opportunity.id) ?? { label: r.opportunity.title, women: 0, total: 0 };
    e.total++;
    if (r.gender_snapshot === "female") e.women++;
    perOpp.set(r.opportunity.id, e);
  }
  const womenShare = [...perOpp.values()].map((e) => ({ label: e.label, value: Math.round((e.women / e.total) * 100), total: e.total }));

  const labels = { women: common("women"), men: common("men"), table: t("table"), total: t("total"), target: t("target"), percent: t("womenPercent"), count: t("applicants") };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        <CsvButton action={exportApplicationsCsv} filename="applications.csv">{t("exportApplications")}</CsvButton>
        <CsvButton action={exportUsersCsv} filename="users.csv">{t("exportUsers")}</CsvButton>
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState title={t("noData")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <GenderReport title={t("byGender")} data={gender} labels={labels} />
          <WomenShareReport title={t("womenPerOpp")} data={womenShare} labels={labels} />
          <BarReport title={t("byRegion")} data={byRegion} labels={labels} />
          <BarReport title={t("byAge")} data={byAge} labels={labels} />
          <BarReport title={t("byProgram")} data={byProgram} labels={labels} />
        </div>
      )}
    </div>
  );
}
