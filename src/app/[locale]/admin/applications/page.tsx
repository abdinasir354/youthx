import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { BulkApplications, type AdminAppRow } from "@/components/admin/bulk-applications";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { APPLICATION_STATUSES } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("applications"), robots: { index: false } };
}

export default async function AdminApplicationsPage({ searchParams }: PageProps<"/[locale]/admin/applications">) {
  await requireAdmin("people");
  const { status } = (await searchParams) as { status?: string };
  const t = await getTranslations("admin");
  const ta = await getTranslations("appStatus");
  const common = await getTranslations("common");

  const supabase = await createClient();
  let q = supabase
    .from("applications")
    .select("id, status, gender_snapshot, submitted_at, opportunity:opportunities(id, title), applicant:profiles!applications_applicant_id_fkey(full_name, email, region)")
    .order("submitted_at", { ascending: false })
    .limit(300);
  if (status && (APPLICATION_STATUSES as string[]).includes(status)) q = q.eq("status", status);
  const { data } = await q;
  const rows = (data as unknown as AdminAppRow[]) ?? [];

  return (
    <div>
      <PageHeader title={t("applications")} />
      <nav className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...APPLICATION_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/applications?status=${s}` : "/admin/applications"}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", status === s ? "border-secondary bg-secondary text-white" : "border-border bg-white text-secondary hover:bg-muted")}
          >
            {s ? ta(s) : common("all")}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <EmptyState title={common("noResults")} /> : <BulkApplications rows={rows} />}
    </div>
  );
}
