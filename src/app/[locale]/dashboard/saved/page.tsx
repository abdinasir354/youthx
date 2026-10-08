import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Bookmark } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSeats } from "@/lib/data/public";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { Opportunity } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("saved"), robots: { index: false } };
}

export default async function SavedPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_opportunities")
    .select("opportunity:opportunities(*, organization:organizations(id, name, slug, logo_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const opps = ((data ?? []) as unknown as { opportunity: Opportunity | null }[]).map((r) => r.opportunity).filter((o): o is Opportunity => !!o);
  const seats = await getSeats(opps.map((o) => o.id));

  return (
    <div>
      <PageHeader title={t("saved")} />
      {opps.length === 0 ? (
        <EmptyState icon={Bookmark} title={t("noSaved")} description={t("noSavedText")}>
          <Link href="/opportunities" className={buttonVariants()}>
            {t("browse")}
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {opps.map((o) => (
            <OpportunityCard key={o.id} opp={o} seats={seats[o.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
