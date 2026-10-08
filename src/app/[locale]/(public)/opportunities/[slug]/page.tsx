import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2, CalendarDays, Globe2, MapPin, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityBySlug, getSeats } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import { sanitize } from "@/lib/sanitize";
import { formatDate, isPastDeadline } from "@/lib/utils";
import { ApplyForm } from "@/components/opportunities/apply-form";
import { SaveButton } from "@/components/opportunities/save-button";
import { Deadline } from "@/components/opportunities/deadline";
import { SeatDetail } from "@/components/opportunities/seat-bar";
import { AppStatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert, PageSkeleton, Skeleton } from "@/components/ui/misc";
import type { ApplicationStatus, Opportunity } from "@/types/database.types";

export async function generateMetadata({ params }: PageProps<"/[locale]/opportunities/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const opp = await getOpportunityBySlug(slug);
  if (!opp) return {};
  return {
    title: opp.title,
    description: opp.summary ?? undefined,
    openGraph: { title: opp.title, description: opp.summary ?? undefined, images: opp.cover_url ? [opp.cover_url] : undefined },
  };
}

export default function OpportunityPage({ params }: PageProps<"/[locale]/opportunities/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10"><PageSkeleton /></div>}>
      <OpportunityDetail params={params} />
    </Suspense>
  );
}

async function OpportunityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const opp = await getOpportunityBySlug(slug);
  if (!opp) notFound();
  const t = await getTranslations("opportunities");
  const tt = await getTranslations("types");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const seats = (await getSeats([opp.id]))[opp.id];

  return (
    <>
      <section className="bg-secondary py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{tt(opp.type)}</Badge>
            {opp.is_remote && (
              <Badge variant="outline" className="border-white/30 text-white">
                <Globe2 className="size-3" /> {common("remote")}
              </Badge>
            )}
            {opp.status === "closed" && <Badge variant="danger">{t("closed")}</Badge>}
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold sm:text-4xl">{opp.title}</h1>
          {opp.summary && <p className="mt-3 max-w-3xl text-white/80">{opp.summary}</p>}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            {opp.organization && (
              <span className="flex items-center gap-1.5"><Building2 className="size-4 text-primary" />{opp.organization.name}</span>
            )}
            {opp.region && <span className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{opp.region}</span>}
            <Deadline value={opp.apply_deadline} className="text-white/80" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          {opp.description && (
            <section>
              <h2 className="text-xl font-bold text-secondary">{t("about")}</h2>
              <div className="prose-content mt-2" dangerouslySetInnerHTML={{ __html: sanitize(opp.description) }} />
            </section>
          )}
          {opp.requirements && (
            <section>
              <h2 className="text-xl font-bold text-secondary">{t("requirements")}</h2>
              <div className="prose-content mt-2" dangerouslySetInnerHTML={{ __html: sanitize(opp.requirements) }} />
            </section>
          )}
          <section className="rounded-2xl border border-border bg-white p-5">
            <h2 className="mb-3 font-bold text-secondary">{t("details")}</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail icon={<Users className="size-4" />} label={t("ageRange")} value={t("ageRangeValue", { min: opp.min_age ?? 15, max: opp.max_age ?? 35 })} />
              <Detail icon={<MapPin className="size-4" />} label={t("location")} value={opp.is_remote ? common("remote") : opp.region ?? "—"} />
              {opp.starts_at && <Detail icon={<CalendarDays className="size-4" />} label={t("starts")} value={formatDate(opp.starts_at, locale)} />}
              {opp.ends_at && <Detail icon={<CalendarDays className="size-4" />} label={t("ends")} value={formatDate(opp.ends_at, locale)} />}
            </dl>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-secondary">{t("seatsTitle")}</h2>
            <SeatDetail seats={seats} />
          </div>
          <div id="apply" className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <Suspense fallback={<Skeleton className="h-40" />}>
              <ApplyPanel opp={opp} />
            </Suspense>
          </div>
        </aside>
      </div>
    </>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-secondary">{icon}</span>
      <div>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-semibold text-secondary">{value}</dd>
      </div>
    </div>
  );
}

/** Per-user part of the page: login prompt, existing application, or the apply form. */
async function ApplyPanel({ opp }: { opp: Opportunity }) {
  await connection(); // per-request: depends on the user and the current time
  const t = await getTranslations("opportunities");
  const locale = await getLocale();
  const ta = await getTranslations("apply");
  const user = await getCurrentUser();
  const closed = opp.status !== "published" || isPastDeadline(opp.apply_deadline);

  if (!user) {
    return closed ? (
      <Alert variant="warning">{t("deadlinePassed")}</Alert>
    ) : (
      <Link href={`/login?next=${locale === "en" ? "" : `/${locale}`}/opportunities/${opp.slug}`} className={buttonVariants({ className: "w-full", size: "lg" })}>
        {t("loginToApply")}
      </Link>
    );
  }

  const supabase = await createClient();
  const [{ data: existing }, { data: saved }] = await Promise.all([
    supabase.from("applications").select("id, status").eq("opportunity_id", opp.id).eq("applicant_id", user.id).maybeSingle(),
    supabase.from("saved_opportunities").select("opportunity_id").eq("opportunity_id", opp.id).eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SaveButton opportunityId={opp.id} initialSaved={!!saved} />
      </div>
      {existing ? (
        <div className="space-y-3">
          <p className="flex items-center justify-between font-semibold text-secondary">
            {t("alreadyApplied")} <AppStatusBadge status={existing.status as ApplicationStatus} />
          </p>
          <Link href="/dashboard/applications" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            {t("viewApplication")}
          </Link>
        </div>
      ) : closed ? (
        <Alert variant="warning">{t("deadlinePassed")}</Alert>
      ) : !user.profile.gender ? (
        <div className="space-y-3">
          <Alert variant="warning">{ta("genderRequired")}</Alert>
          <Link href="/dashboard/profile" className={buttonVariants({ className: "w-full" })}>
            {ta("completeProfile")}
          </Link>
        </div>
      ) : (
        <ApplyForm opportunityId={opp.id} questions={opp.questions ?? []} userId={user.id} profileCvPath={user.profile.cv_path} />
      )}
    </div>
  );
}
