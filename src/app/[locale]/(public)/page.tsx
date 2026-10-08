import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, Briefcase, GraduationCap, Handshake, Lightbulb, Sparkles, Users, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getImpactStats, getPosts, getPublishedOpportunities, getSeats, getVerifiedPartners } from "@/lib/data/public";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { StoryCard } from "@/components/layout/post-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: { absolute: t("metaTitle") } };
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <ImpactSection />
      <FeaturedOpportunities />
      <ProgramsSection />
      <StoriesSection />
      <PartnersSection />
      <CtaSection />
    </>
  );
}

function Hero() {
  const t = useTranslations("home");
  return (
    <section className="relative overflow-hidden bg-secondary text-white">
      <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 -left-20 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            <Sparkles className="size-3.5" />
            {t("heroBadge")}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">{t("heroSubtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/opportunities" className={buttonVariants({ size: "lg" })}>
              {t("heroCta")}
              <ArrowRight />
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-white/30 bg-transparent text-white hover:bg-white/10")}>
              {t("heroCta2")}
            </Link>
          </div>
        </div>
        {/* 75/25 visual */}
        <div className="hidden lg:block" aria-hidden>
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className={cn("aspect-square rounded-full", i < 15 ? "bg-primary" : "bg-white/40")} />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-primary" />15 / 20</span>
              <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-white/40" />5 / 20</span>
            </div>
          </div>
          <p className="mt-6 max-w-md text-white/70">{t("missionText")}</p>
        </div>
      </div>
    </section>
  );
}

async function ImpactSection() {
  const t = await getTranslations("home");
  const stats = await getImpactStats();
  const items = [
    { label: t("statYouth"), value: stats?.youth_registered ?? 0, icon: Users },
    { label: t("statTrained"), value: stats?.youth_trained ?? 0, icon: GraduationCap },
    { label: t("statWomen"), value: `${stats?.women_percent ?? 75}%`, icon: Sparkles },
    { label: t("statJobs"), value: stats?.jobs_placed ?? 0, icon: Briefcase },
  ];
  return (
    <section className="mx-auto -mt-10 max-w-7xl px-4">
      <h2 className="sr-only">{t("impactTitle")}</h2>
      <div className="relative grid grid-cols-2 gap-3 rounded-3xl border border-border bg-white p-4 shadow-xl sm:p-6 lg:grid-cols-4">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-3 sm:p-4">
            <Icon className="size-6 text-secondary" />
            <p className="mt-2 text-3xl font-extrabold text-secondary sm:text-4xl">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function FeaturedOpportunities() {
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const opps = (await getPublishedOpportunities()).slice(0, 6);
  const seats = await getSeats(opps.map((o) => o.id));
  if (opps.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold text-secondary">{t("featuredTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("featuredSubtitle")}</p>
        </div>
        <Link href="/opportunities" className={buttonVariants({ variant: "outline" })}>
          {common("seeAll")} <ArrowRight />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opps.map((o) => (
          <OpportunityCard key={o.id} opp={o} seats={seats[o.id]} />
        ))}
      </div>
    </section>
  );
}

function ProgramsSection() {
  const t = useTranslations("programs");
  const home = useTranslations("home");
  const programs = [
    { key: "education", icon: BookOpen },
    { key: "skills", icon: Wrench },
    { key: "scholarships", icon: GraduationCap },
    { key: "mentorship", icon: Users },
    { key: "jobs", icon: Briefcase },
    { key: "entrepreneurship", icon: Lightbulb },
  ] as const;
  return (
    <section className="bg-muted py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl font-extrabold text-secondary">{home("programsTitle")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map(({ key, icon: Icon }) => (
            <Link key={key} href="/programs" className="group rounded-2xl border border-border bg-white p-6 transition-colors hover:border-primary">
              <span className="inline-flex rounded-xl bg-primary p-2.5 text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-secondary">{t(key)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`${key}Text`)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

async function StoriesSection() {
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const stories = (await getPosts("story", 3)).slice(0, 3);
  if (stories.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-3xl font-extrabold text-secondary">{t("storiesTitle")}</h2>
        <Link href="/stories" className={buttonVariants({ variant: "outline" })}>
          {common("seeAll")} <ArrowRight />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stories.map((s) => (
          <StoryCard key={s.id} post={s} />
        ))}
      </div>
    </section>
  );
}

async function PartnersSection() {
  const t = await getTranslations("home");
  const partners = await getVerifiedPartners();
  if (partners.length === 0) return null;
  return (
    <section className="border-y border-border bg-white py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("partnersTitle")}</h2>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {partners.map((p) => (
            <li key={p.id} className="text-lg font-bold text-secondary/70">
              {p.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CtaSection() {
  const t = useTranslations("home");
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center sm:px-12">
        <Handshake aria-hidden className="absolute -right-6 -top-6 size-40 text-secondary/10" />
        <h2 className="text-3xl font-extrabold text-secondary sm:text-4xl">{t("ctaTitle")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-secondary/80">{t("ctaText")}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            {t("ctaButton")}
          </Link>
          <Link href="/partners#become" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-secondary/30 bg-transparent")}>
            {t("ctaPartner")}
          </Link>
        </div>
      </div>
    </section>
  );
}
