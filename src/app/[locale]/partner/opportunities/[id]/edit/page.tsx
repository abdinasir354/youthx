import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OpportunityForm } from "@/components/partner/opportunity-form";
import { PageHeader } from "@/components/ui/misc";
import type { Opportunity } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partner");
  return { title: t("editOpportunity"), robots: { index: false } };
}

export default async function EditOpportunityPage({ params }: PageProps<"/[locale]/partner/opportunities/[id]/edit">) {
  await requireRole(["partner"], "people");
  const { id } = await params;
  const t = await getTranslations("partner");
  const supabase = await createClient();
  // RLS only returns opportunities of the partner's own organization (or any, for staff).
  const { data } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={t("editOpportunity")} description={(data as Opportunity).title} />
      <OpportunityForm opportunity={data as Opportunity} />
    </div>
  );
}
