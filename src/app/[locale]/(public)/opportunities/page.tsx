import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Search, SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPublishedOpportunities } from "@/lib/data/public";
import { getPage } from "@/lib/data/cms";
import { cn, isPastDeadline } from "@/lib/utils";
import { REGIONS } from "@/types/database.types";
import { Sections } from "@/components/cms/sections";
import { Container, Eyebrow } from "@/components/site/basics";
import { cmsPageMetadata } from "@/components/site/cms-page";
import { FloatingShapes } from "@/components/site/shapes";
import { OpportunityRow } from "@/components/opportunities/opportunity-row";
import { Skeleton } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  return cmsPageMetadata("opportunities", "Opportunities");
}

type Filters = { q?: string; type?: string; region?: string; remote?: string; closed?: string };

export default async function OpportunitiesPage({ searchParams }: PageProps<"/[locale]/opportunities">) {
  const [page, t, ts] = await Promise.all([getPage("opportunities"), getTranslations("opportunities"), getTranslations("site")]);
  return (
    <>
      <section className="relative overflow-hidden bg-surface">
        <FloatingShapes variant="c" />
        <Container className="enter-up relative pb-10 pt-16 sm:pb-14 sm:pt-20">
          <Eyebrow>{ts("opportunitiesEyebrow")}</Eyebrow>
          <h1 className="display mt-4 max-w-3xl text-balance text-5xl text-ink sm:text-6xl">{ts("findNext")}</h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">{page?.page.description ?? t("subtitle")}</p>
          {/* Search + filters read the URL (request data) → stream in behind Suspense */}
          <Suspense fallback={<Skeleton className="mt-10 h-16 max-w-3xl rounded-full" />}>
            <SearchBox searchParams={searchParams as Promise<Filters>} />
          </Suspense>
        </Container>
      </section>
      <section className="bg-white">
        <Container className="py-10 sm:py-14">
          <Suspense fallback={<ResultsSkeleton />}>
            <Results searchParams={searchParams as Promise<Filters>} />
          </Suspense>
        </Container>
      </section>
      {page && <Sections sections={page.sections} />}
    </>
  );
}

function qs(current: Filters, change: Partial<Filters>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...change })) if (v) u.set(k, v);
  const s = u.toString();
  return `/opportunities${s ? `?${s}` : ""}`;
}

/** Big search box + quick type chips (plain links / GET form: works without JavaScript). */
async function SearchBox({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams;
  const [t, tt, ts] = await Promise.all([getTranslations("opportunities"), getTranslations("types"), getTranslations("site")]);
  const quick = ["scholarship", "internship", "fellowship", "training", "job", "competition", "volunteering", "conference"] as const;
  return (
    <div className="mt-10">
      <form role="search" className="flex max-w-3xl items-center gap-2 rounded-full border border-border bg-white p-2 shadow-[0_20px_40px_-24px_rgba(18,53,46,0.35)] focus-within:ring-2 focus-within:ring-primary">
        {params.type && <input type="hidden" name="type" value={params.type} />}
        {params.region && <input type="hidden" name="region" value={params.region} />}
        {params.remote && <input type="hidden" name="remote" value={params.remote} />}
        {params.closed && <input type="hidden" name="closed" value={params.closed} />}
        <Search className="ml-4 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <label htmlFor="opp-q" className="sr-only">{t("searchPlaceholder")}</label>
        <input
          id="opp-q"
          name="q"
          defaultValue={params.q}
          placeholder={ts("searchOpportunities")}
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted-foreground focus:outline-none sm:text-lg"
        />
        <button type="submit" className="h-12 shrink-0 rounded-full bg-ink px-6 text-base font-bold text-white transition hover:bg-secondary-hover">
          {ts("search")}
        </button>
      </form>
      <nav aria-label={t("filterType")} className="mt-5 flex flex-wrap gap-2">
        <Link href={qs(params, { type: undefined })} aria-current={!params.type ? "page" : undefined} className={chip(!params.type)}>
          {t("allTypes")}
        </Link>
        {quick.map((type) => (
          <Link key={type} href={qs(params, { type })} aria-current={params.type === type ? "page" : undefined} className={chip(params.type === type)}>
            {tt(type)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

const chip = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-2 text-sm font-semibold transition",
    active ? "border-ink bg-ink text-white" : "border-border bg-white text-ink hover:border-secondary/40",
  );

async function Results({ searchParams }: { searchParams: Promise<Filters> }) {
  await connection(); // filters depend on the current time (deadlines / expiry) → request time
  const params = await searchParams;
  const [t, ts, common] = await Promise.all([getTranslations("opportunities"), getTranslations("site"), getTranslations("common")]);

  const q = (params.q ?? "").toLowerCase().trim().slice(0, 100);
  // Listings past their expiry date are hidden automatically (and closed by the daily job).
  const all = (await getPublishedOpportunities()).filter((o) => !o.expires_at || !isPastDeadline(o.expires_at));
  const opps = all.filter((o) => {
    if (params.type && o.type !== params.type) return false;
    if (params.region && o.region !== params.region) return false;
    if (params.remote === "1" && !o.is_remote) return false;
    if (params.closed !== "1" && (o.status === "closed" || isPastDeadline(o.apply_deadline))) return false;
    if (q && !`${o.title} ${o.summary ?? ""} ${o.organization?.name ?? ""} ${o.organization_name ?? ""} ${o.location ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  // Featured first, then soonest deadline.
  opps.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || (a.apply_deadline ?? "9999").localeCompare(b.apply_deadline ?? "9999"));
  const filtered = Boolean(q || params.type || params.region || params.remote || params.closed);

  return (
    <>
      {/* Toolbar: count + secondary filters (GET form) */}
      <form className="mb-8 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        {params.q && <input type="hidden" name="q" value={params.q} />}
        {params.type && <input type="hidden" name="type" value={params.type} />}
        <p className="text-lg text-ink" aria-live="polite">
          <span className="font-extrabold">{opps.length}</span> {ts("opportunitiesFound", { count: opps.length })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="opp-region">{t("filterRegion")}</label>
          <select id="opp-region" name="region" defaultValue={params.region ?? ""} className="h-11 rounded-full border border-border bg-white px-4 text-sm font-medium text-ink">
            <option value="">{t("allRegions")}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-ink">
            <input type="checkbox" name="remote" value="1" defaultChecked={params.remote === "1"} className="size-4 accent-secondary" /> {t("filterRemote")}
          </label>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-ink">
            <input type="checkbox" name="closed" value="1" defaultChecked={params.closed === "1"} className="size-4 accent-secondary" /> {ts("includeClosed")}
          </label>
          <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-ink transition hover:bg-primary-hover">
            {common("filter")}
          </button>
          {filtered && (
            <Link href="/opportunities" className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-ink hover:underline">
              {ts("clearFilters")}
            </Link>
          )}
        </div>
      </form>

      {opps.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <SearchX className="mx-auto size-10 text-secondary/40" aria-hidden />
          <p className="heading mt-4 text-2xl text-ink">{all.length === 0 ? t("noneTitle") : ts("noMatches")}</p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">{all.length === 0 ? t("noneText") : ts("noMatchesHint")}</p>
        </div>
      ) : (
        <div data-reveal-stagger className="space-y-4">
          {opps.map((o) => (
            <OpportunityRow key={o.id} opp={o} />
          ))}
        </div>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-3xl" />
      ))}
    </div>
  );
}
