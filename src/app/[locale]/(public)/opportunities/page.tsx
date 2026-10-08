import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { getPublishedOpportunities, getSeats } from "@/lib/data/public";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { EmptyState, PageSkeleton } from "@/components/ui/misc";
import { isPastDeadline } from "@/lib/utils";
import { OPPORTUNITY_TYPES, REGIONS } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("opportunities");
  return { title: t("metaTitle"), description: t("subtitle") };
}

type Filters = { q?: string; type?: string; region?: string; remote?: string; open?: string };

export default function OpportunitiesPage({ searchParams }: PageProps<"/[locale]/opportunities">) {
  const t = useTranslations("opportunities");
  return (
    <>
      <section className="bg-secondary py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-4xl font-extrabold">{t("title")}</h1>
          <p className="mt-2 text-white/80">{t("subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* searchParams are request data → filters + results stream in behind Suspense */}
        <Suspense fallback={<PageSkeleton />}>
          <FilteredResults searchParams={searchParams as Promise<Filters>} />
        </Suspense>
      </div>
    </>
  );
}

async function FilteredResults({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams;
  const t = await getTranslations("opportunities");
  const tt = await getTranslations("types");
  const common = await getTranslations("common");

  const q = (params.q ?? "").toLowerCase().trim().slice(0, 100);
  const all = await getPublishedOpportunities();
  const opps = all.filter((o) => {
    if (params.type && o.type !== params.type) return false;
    if (params.region && o.region !== params.region) return false;
    if (params.remote === "1" && !o.is_remote) return false;
    if (params.open === "1" && isPastDeadline(o.apply_deadline)) return false;
    if (q && !`${o.title} ${o.summary ?? ""} ${o.organization?.name ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const seats = await getSeats(opps.map((o) => o.id));

  return (
    <>
      {/* Plain GET form: works without JavaScript on slow phones */}
      <form className="mb-8 grid gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={params.q} placeholder={t("searchPlaceholder")} aria-label={common("search")} className="pl-9" />
        </div>
        <Select name="type" defaultValue={params.type ?? ""} aria-label={t("filterType")}>
          <option value="">{t("allTypes")}</option>
          {OPPORTUNITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {tt(type)}
            </option>
          ))}
        </Select>
        <Select name="region" defaultValue={params.region ?? ""} aria-label={t("filterRegion")}>
          <option value="">{t("allRegions")}</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          {common("filter")}
        </Button>
        <div className="flex flex-wrap gap-5 md:col-span-4">
          <label className="flex items-center gap-2 text-sm text-secondary">
            <Checkbox name="remote" value="1" defaultChecked={params.remote === "1"} />
            {t("filterRemote")}
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary">
            <Checkbox name="open" value="1" defaultChecked={params.open === "1"} />
            {t("filterOpen")}
          </label>
        </div>
      </form>

      {opps.length === 0 ? (
        <EmptyState title={all.length === 0 ? t("noneTitle") : common("noResults")} description={all.length === 0 ? t("noneText") : common("noResultsHint")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opps.map((o) => (
            <OpportunityCard key={o.id} opp={o} seats={seats[o.id]} />
          ))}
        </div>
      )}
    </>
  );
}
