import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, CalendarDays, CalendarRange, ExternalLink, FileDown, Globe2, MapPin, Tag, Users, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getOpportunityBySlug } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { isPastDeadline } from "@/lib/utils";
import type { Opportunity } from "@/types/database.types";
import { Container, RichText, formatEventDate, pill } from "@/components/site/basics";
import { Countdown } from "@/components/opportunities/countdown";
import { PageSkeleton, Skeleton } from "@/components/ui/misc";

export async function generateMetadata({ params }: PageProps<"/[locale]/opportunities/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const opp = await getOpportunityBySlug(slug);
  if (!opp) return {};
  return pageMetadata({ title: opp.seo_title || opp.title, description: opp.seo_description || opp.summary, image: opp.cover_url, path: `/opportunities/${opp.slug}` });
}

export default function OpportunityPage({ params }: PageProps<"/[locale]/opportunities/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><PageSkeleton /></div>}>
      <OpportunityDetail params={params} />
    </Suspense>
  );
}

const day = (iso: string | null) => (iso ? formatEventDate(iso, { day: "numeric", month: "long", year: "numeric" }) : null);

async function OpportunityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const opp = await getOpportunityBySlug(slug);
  if (!opp) notFound();
  const [t, tt, ts] = await Promise.all([getTranslations("opportunities"), getTranslations("types"), getTranslations("site")]);
  const org = opp.organization?.name ?? opp.organization_name ?? "Youthup Foundation";
  const where = [opp.location, opp.region].filter(Boolean).join(", ");

  const chips = [
    where && { icon: MapPin, text: where },
    opp.is_remote && { icon: Globe2, text: ts("remote") },
    opp.starts_at && { icon: CalendarDays, text: `${t("starts")} ${day(opp.starts_at)}` },
  ].filter(Boolean) as { icon: LucideIcon; text: string }[];

  const glance = [
    { icon: Tag, label: ts("type"), value: tt(opp.type) },
    { icon: MapPin, label: t("location"), value: opp.is_remote ? (where ? `${where} · ${ts("remote")}` : ts("remote")) : where || null },
    { icon: Users, label: t("ageRange"), value: t("ageRangeValue", { min: opp.min_age ?? 15, max: opp.max_age ?? 35 }) },
    { icon: CalendarRange, label: ts("dates"), value: [day(opp.starts_at), day(opp.ends_at)].filter(Boolean).join(" – ") || null },
    { icon: Users, label: ts("places"), value: opp.capacity ? String(opp.capacity) : null },
  ].filter((g) => g.value) as { icon: LucideIcon; label: string; value: string }[];

  return (
    <>
      {/* The pass */}
      <section className="relative overflow-hidden bg-surface">
        <Container className="relative py-8 sm:py-10">
          <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors duration-300 hover:text-ink [&>svg]:transition-transform [&>svg]:duration-300 hover:[&>svg]:-translate-x-1">
            <ArrowLeft className="size-4" aria-hidden /> {ts("allOpportunities")}
          </Link>

          <article className="enter-up enter-up-1 mt-8 flex flex-col overflow-hidden rounded-xl lg:flex-row">
            {/* Main part */}
            <div className="relative flex-1 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#4d6b00]">{tt(opp.type)}</span>
                {opp.is_featured && <span className="rounded-full bg-[#fdebc8] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8a5a00]">{ts("featured")}</span>}
              </div>
              <h1 className="display mt-4 max-w-3xl text-balance text-3xl text-ink sm:text-4xl lg:text-[2.75rem]">{opp.title}</h1>
              <div className="mt-6 flex items-center gap-3">
                <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-ink text-lg font-semibold text-primary">{org.trim()[0]?.toUpperCase()}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ts("offeredBy")}</p>
                  <p className="font-semibold text-ink">{org}</p>
                </div>
              </div>
              {opp.summary && <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{opp.summary}</p>}
              {chips.length > 0 && (
                <ul className="mt-7 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <li key={c.text} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink">
                      <c.icon className="size-4 text-secondary" aria-hidden /> {c.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Perforation */}
            <div aria-hidden className="relative flex h-0 items-center bg-white lg:h-auto lg:w-0 lg:flex-col">
              <span className="absolute -left-4 top-1/2 size-8 -translate-y-1/2 rounded-full bg-surface lg:left-1/2 lg:top-0 lg:-translate-x-1/2" />
              <span className="absolute -right-4 top-1/2 size-8 -translate-y-1/2 rounded-full bg-surface lg:left-1/2 lg:right-auto lg:top-auto lg:bottom-0 lg:-translate-x-1/2 lg:translate-y-1/2" />
              <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-border lg:inset-y-6 lg:left-0 lg:right-auto lg:border-l-2 lg:border-t-0" />
            </div>

            {/* Stub */}
            <aside id="apply" className="relative flex flex-col justify-between gap-6 overflow-hidden bg-ink p-6 text-white sm:p-8 lg:w-[22rem]">
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{ts("applyBy")}</p>
                <div className="mt-4">
                  <Countdown deadline={opp.apply_deadline} />
                </div>
                {opp.apply_deadline && <p className="mt-2 text-sm text-white/60">{formatEventDate(opp.apply_deadline, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} EAT</p>}
              </div>
              <div className="relative">
                <Suspense fallback={<Skeleton className="h-14 rounded-full bg-white/10" />}>
                  <ApplyButton opp={opp} />
                </Suspense>
              </div>
            </aside>
          </article>
        </Container>
      </section>

      {/* Details */}
      <section className="bg-white">
        <Container className="grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {opp.description && (
              <section aria-labelledby="opp-about" data-reveal className="rounded-xl border border-border p-6 sm:p-8">
                <h2 id="opp-about" className="heading text-3xl text-ink">{t("about")}</h2>
                <RichText markdown={opp.description} className="mt-5 break-words" />
              </section>
            )}
            {opp.requirements && (
              <section aria-labelledby="opp-who" data-reveal className="rounded-xl bg-surface p-6 sm:p-8">
                <h2 id="opp-who" className="heading text-3xl text-ink">{ts("whoCanApply")}</h2>
                <RichText markdown={opp.requirements} className="mt-5 break-words" />
              </section>
            )}
          </div>

          <aside data-reveal className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-border p-7">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ts("atAGlance")}</h2>
              <dl className="mt-5 space-y-4">
                {glance.map((g) => (
                  <div key={g.label} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-[#4d6b00]">
                      <g.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</dt>
                      <dd className="mt-0.5 font-semibold text-ink">{g.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
            {opp.attachment_url && (
              <a href={opp.attachment_url} target="_blank" rel="noopener" className={`${pill.outline} w-full`}>
                <FileDown className="size-5" aria-hidden /> {ts("downloadAttachment")}
              </a>
            )}
          </aside>
        </Container>
      </section>
    </>
  );
}

/**
 * How to apply. External listings link to the organizer's own form; our own opportunities
 * open the contact form with the opportunity already filled in (no accounts needed).
 */
async function ApplyButton({ opp }: { opp: Opportunity }) {
  await connection(); // depends on the current time
  const ts = await getTranslations("site");
  const closed = opp.status !== "published" || isPastDeadline(opp.expires_at ?? opp.apply_deadline);
  if (closed) {
    return (
      <div>
        <p className="rounded-2xl bg-white/[0.08] px-5 py-4 text-sm leading-relaxed text-white/80">{ts("closedNote")}</p>
        <Link href="/opportunities" className={`${pill.ghostLight} mt-4 w-full`}>
          {ts("seeOpen")}
        </Link>
      </div>
    );
  }
  if (opp.apply_mode === "external" && opp.application_url) {
    return (
      <div>
        <a href={opp.application_url} target="_blank" rel="noopener noreferrer" className={`${pill.primary} w-full`}>
          {ts("applyExternal")} <ExternalLink className="size-4" aria-hidden />
        </a>
        <p className="mt-3 text-sm text-white/60">{ts("externalNote", { org: opp.organization?.name ?? opp.organization_name ?? ts("theOrganizer") })}</p>
      </div>
    );
  }
  const href = `/contact?type=programs&subject=${encodeURIComponent(`${ts("applicationFor")}: ${opp.title}`)}`;
  return (
    <div>
      <Link href={href} className={`${pill.primary} w-full`}>
        {ts("contactToApply")} <span aria-hidden>→</span>
      </Link>
      <p className="mt-3 text-sm text-white/60">{ts("contactToApplyText")}</p>
    </div>
  );
}
