import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, ChevronDown, Quote, Sparkles } from "lucide-react";
import { getEvents, getFaqs, getPartnerLogos, getProgramCategories, getProjects, getPrograms, getResources, getStories, getUpcomingEvents, pickItems } from "@/lib/data/cms";
import { getImpactStats, getOpenOpportunities } from "@/lib/data/public";
import { markdownToSafeHtml } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import type { CmsSection, Story } from "@/types/cms";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { ArrowLink, Container, Eyebrow, RichText, SectionHeading, SmartLink, pill } from "@/components/site/basics";
import { Link } from "@/i18n/navigation";
import { EventCard, ProgramCard, ProjectCard, ResourceCard, StoryCard } from "@/components/site/cards";
import { FloatingShapes, PhotoPlaceholder } from "@/components/site/shapes";
import { CmsIcon } from "./icon";

type Data = Record<string, unknown>;
type Link = { label: string; href: string } | null;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const link = (v: unknown): Link => {
  const l = v as { label?: string; href?: string } | null;
  return l?.label && l?.href ? { label: l.label, href: l.href } : null;
};

/** Pastel tiles for card icons, cycling so every card feels distinct. */
export const TILE_TONES = [
  "bg-[#ecf7c6] text-[#4d6b00]",
  "bg-[#d8efe9] text-[#1c4b40]",
  "bg-[#fdebc8] text-[#8a5a00]",
  "bg-[#e3ecfb] text-[#264f8c]",
  "bg-[#f8e1e7] text-[#8c2f4b]",
  "bg-[#ece6fa] text-[#4d3a8c]",
];

/**
 * Renders a page's sections in order. Plain sections alternate between the warm off-white
 * and white so the rhythm stays consistent however editors reorder them.
 */
export async function Sections({ sections }: { sections: CmsSection[] }) {
  let plain = 0;
  return (
    <>
      {sections.map((s, i) => {
        const self = s.type === "hero" || s.type === "cta" || s.type === "statistics";
        const tone = self ? "none" : plain++ % 2 === 0 ? "surface" : "white";
        return <Section key={s.id} section={s} tone={tone} first={i === 0} />;
      })}
    </>
  );
}

async function Section({ section, tone, first }: { section: CmsSection; tone: "surface" | "white" | "none"; first: boolean }) {
  const d = section.data;
  const id = section.anchor ?? undefined;
  const headingId = `h-${section.id}`;
  const labelledBy = str(d.heading) ? headingId : undefined;
  const wrap = (children: React.ReactNode, opts?: { narrow?: boolean; shapes?: "a" | "b" | "c" }) => (
    <section id={id} aria-labelledby={labelledBy} className={cn("relative scroll-mt-24 overflow-hidden py-12 sm:py-16", tone === "white" ? "bg-white" : "bg-surface")}>
      {opts?.shapes && <FloatingShapes variant={opts.shapes} />}
      <Container narrow={opts?.narrow} className="relative">{children}</Container>
    </section>
  );

  switch (section.type) {
    case "hero":
      return d.layout === "index" ? <IndexHero data={d} id={id} first={first} /> : <Hero data={d} id={id} first={first} />;

    case "rich_text": {
      const narrow = d.width === "narrow";
      return wrap(
        <>
          <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} id={headingId} />
          <RichText markdown={str(d.body)} className={narrow ? undefined : "max-w-3xl"} />
        </>,
        { narrow },
      );
    }

    case "image_text": {
      const image = str(d.image_url);
      const cta = link(d.cta);
      const imageLeft = d.image_side !== "right";
      const stat = str(d.stat_value);
      const text = (
        <div>
          {str(d.eyebrow) && <Eyebrow>{str(d.eyebrow)}</Eyebrow>}
          <h2 id={headingId} className="heading mt-3 text-balance text-3xl text-ink sm:text-4xl lg:text-5xl">{str(d.heading)}</h2>
          <RichText markdown={str(d.body)} className="mt-6 [&>p:first-child]:text-lg sm:[&>p:first-child]:text-xl [&>p:not(:first-child)]:text-base [&>p:not(:first-child)]:text-muted-foreground" />
          {cta && (
            <SmartLink href={cta.href} className={cn(pill.outline, "mt-6")}>
              {cta.label} <span aria-hidden>→</span>
            </SmartLink>
          )}
        </div>
      );
      const media = (
        <div className="relative">
          <FloatingShapes variant="b" className="-inset-10 overflow-visible" />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-20px_rgba(18,53,46,0.35)]">
            {image ? (
              <Image src={image} alt={str(d.image_alt) ?? ""} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            ) : (
              <PhotoPlaceholder className="absolute inset-0" />
            )}
          </div>
          {stat && (
            <div className="absolute -bottom-6 left-6 rounded-2xl bg-white/95 px-6 py-5 shadow-xl backdrop-blur sm:left-10">
              <p className="heading text-3xl text-ink sm:text-4xl">{stat}</p>
              {str(d.stat_label) && <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{str(d.stat_label)}</p>}
            </div>
          )}
        </div>
      );
      return wrap(
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {imageLeft ? media : text}
          {imageLeft ? text : media}
        </div>,
      );
    }

    case "cards":
      return <Cards data={d} wrap={wrap} headingId={headingId} />;

    case "story_grid":
      return <StorySpotlight data={d} wrap={wrap} headingId={headingId} />;

    case "program_grid":
    case "opportunity_grid":
    case "event_grid":
    case "project_grid":
    case "resource_grid":
      return <Grid section={section} wrap={wrap} headingId={headingId} />;

    case "cta":
      return <Cta data={d} id={id} />;

    case "faq": {
      const faqs = await getFaqs(str(d.category) ?? "general");
      if (!faqs.length) return null;
      return wrap(
        <>
          <SectionHeading heading={str(d.heading)} intro={str(d.intro)} id={headingId} />
          <div className="divide-y divide-border rounded-3xl border border-border bg-white">
            {faqs.map((f) => (
              <details key={f.id} className="group px-6 py-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold text-ink">
                  {f.question}
                  <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="prose-cms pb-6 text-base text-foreground/85" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(f.answer) }} />
              </details>
            ))}
          </div>
        </>,
        { narrow: true },
      );
    }

    case "statistics": {
      const stats = (await getImpactStats()) as unknown as Record<string, number | null> | null;
      const items = ((Array.isArray(d.items) ? d.items : []) as Data[])
        .map((it) => {
          const metric = str(it.metric);
          const raw = metric === "custom" ? str(it.value) : stats && metric ? stats[metric] : null;
          return { label: str(it.label) ?? "", value: raw };
        })
        .filter((it) => it.value != null && !(d.hide_when_zero && (it.value === 0 || it.value === "0")));
      if (!items.length) return null;
      return (
        <section id={id} aria-labelledby={labelledBy} className="relative scroll-mt-24 overflow-hidden bg-ink py-12 text-white sm:py-16">
          <FloatingShapes variant="a" />
          <Container className="relative">
            <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} invert id={headingId} />
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {items.map((it) => (
                <div key={it.label} className="rounded-3xl bg-white/[0.06] p-7 ring-1 ring-white/10">
                  <dd className="display text-5xl tabular-nums text-primary sm:text-6xl">{typeof it.value === "number" ? it.value.toLocaleString("en-GB") : it.value}</dd>
                  <dt className="mt-3 text-base text-white/75">{it.label}</dt>
                </div>
              ))}
            </dl>
          </Container>
        </section>
      );
    }

    case "gallery": {
      const images = ((Array.isArray(d.images) ? d.images : []) as Data[]).filter((x) => str(x.url));
      if (!images.length) return null;
      return wrap(
        <>
          <SectionHeading heading={str(d.heading)} intro={str(d.intro)} id={headingId} />
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {images.map((img, i) => (
              <li key={i}>
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                    <Image src={str(img.url)!} alt={str(img.alt) ?? ""} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                  </div>
                  {str(img.caption) && <figcaption className="mt-2 text-sm text-muted-foreground">{str(img.caption)}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        </>,
      );
    }

    case "video": {
      const embed = videoEmbed(str(d.url));
      if (!embed) return null;
      return wrap(
        <>
          <SectionHeading heading={str(d.heading)} id={headingId} />
          <figure>
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-black shadow-xl">
              <iframe src={embed} title={str(d.heading) ?? "Video"} className="absolute inset-0 size-full" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
            </div>
            {str(d.caption) && <figcaption className="mt-3 text-sm text-muted-foreground">{str(d.caption)}</figcaption>}
          </figure>
        </>,
        { narrow: true },
      );
    }

    case "partner_logos": {
      const partners = await getPartnerLogos();
      if (!partners.length) return null;
      return wrap(
        <>
          <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} id={headingId} />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {partners.map((p) => {
              const inner = p.logo_url ? (
                <span className="relative block h-14 w-full">
                  <Image src={p.logo_url} alt={p.name} fill sizes="200px" className="object-contain grayscale transition hover:grayscale-0" />
                </span>
              ) : (
                <span className="text-center font-semibold text-ink">{p.name}</span>
              );
              return (
                <li key={p.id} className="flex h-28 items-center justify-center rounded-3xl border border-border bg-white p-5">
                  {p.website ? (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center" title={p.name}>
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </>,
      );
    }
  }
}

function Hero({ data: d, id, first }: { data: Data; id?: string; first: boolean }) {
  if (d.layout === "centered") return <CenteredHero data={d} id={id} first={first} />;
  const primary = link(d.primary_cta);
  const secondary = link(d.secondary_cta);
  const Heading = first ? "h1" : "h2";
  const img1 = str(d.image_url);
  const img2 = str(d.image2_url);
  return (
    <section id={id} className="relative overflow-hidden bg-surface">
      <FloatingShapes variant="a" />
      <Container className="relative grid items-center gap-10 py-10 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-14">
        <div>
          {str(d.eyebrow) && (
            <p className="inline-flex items-center gap-2.5 rounded-full border border-primary/60 bg-primary-soft px-5 py-2.5 text-[0.8125rem] font-bold uppercase tracking-[0.2em] text-[#4d6b00]">
              <Sparkles className="size-4" aria-hidden /> {str(d.eyebrow)}
            </p>
          )}
          <Heading className="display mt-6 text-balance text-[2.8rem] sm:text-6xl xl:text-[4.75rem]">
            <span className="text-ink">{str(d.heading)}</span>
            {str(d.heading_accent) && (
              <>
                {" "}
                <span className="block text-[#a3d40f]">{str(d.heading_accent)}</span>
              </>
            )}
          </Heading>
          {str(d.subheading) && <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">{str(d.subheading)}</p>}
          {(primary || secondary) && (
            <div className="mt-10 flex flex-wrap gap-3">
              {primary && (
                <SmartLink href={primary.href} className={pill.dark}>
                  {primary.label} <span aria-hidden>→</span>
                </SmartLink>
              )}
              {secondary && (
                <SmartLink href={secondary.href} className={pill.outline}>
                  {secondary.label}
                </SmartLink>
              )}
            </div>
          )}
        </div>

        {/* Photo collage */}
        <div className="relative mx-auto w-full max-w-xl pb-8 pl-6 sm:pb-12 sm:pl-12 lg:max-w-none">
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2.5rem] shadow-[0_40px_80px_-30px_rgba(18,53,46,0.45)]">
            {img1 ? (
              <Image src={img1} alt={str(d.image_alt) ?? ""} fill preload={first} sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
            ) : (
              <PhotoPlaceholder className="absolute inset-0" />
            )}
          </div>
          <div className="absolute bottom-0 left-0 w-[46%] overflow-hidden rounded-[2rem] border-[6px] border-surface shadow-xl sm:border-8">
            <div className="relative aspect-[4/3]">
              {img2 ? (
                <Image src={img2} alt={str(d.image2_alt) ?? ""} fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover" />
              ) : (
                <PhotoPlaceholder tone="lime" className="absolute inset-0" />
              )}
            </div>
          </div>
          {str(d.stat_value) && (
            <div className="float-a absolute -top-4 right-2 flex size-28 flex-col items-center justify-center rounded-full bg-primary text-center shadow-lg sm:-top-6 sm:right-4 sm:size-36">
              <span className="heading text-3xl text-ink sm:text-4xl">{str(d.stat_value)}</span>
              {str(d.stat_label) && <span className="mt-0.5 max-w-[80%] text-[0.625rem] font-bold uppercase leading-tight tracking-wider text-ink sm:text-xs">{str(d.stat_label)}</span>}
            </div>
          )}
          {str(d.card_text) && (
            <div className="absolute -bottom-2 right-0 max-w-[60%] rounded-2xl bg-white px-5 py-4 shadow-xl sm:right-6">
              {str(d.card_label) && (
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#4d6b00]">
                  <span className="size-2.5 rounded-full bg-primary" aria-hidden /> {str(d.card_label)}
                </p>
              )}
              <p className="mt-1.5 text-base font-bold text-ink sm:text-lg">{str(d.card_text)}</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

/** Compact dark banner: headline, text, buttons, and one row of program categories (with live counts). */
async function IndexHero({ data: d, id, first }: { data: Data; id?: string; first: boolean }) {
  const [programs, categories] = await Promise.all([getPrograms(), getProgramCategories()]);
  const cats = categories
    .map((c) => ({ ...c, count: programs.filter((p) => p.category_id === c.id).length }))
    .filter((c) => c.count > 0);
  const primary = link(d.primary_cta);
  const secondary = link(d.secondary_cta);
  const Heading = first ? "h1" : "h2";
  return (
    <section id={id} className="relative overflow-hidden bg-ink text-white">
      <FloatingShapes variant="a" />
      <Container className="relative py-10 sm:py-12">
        <div className="max-w-3xl">
          {str(d.eyebrow) && <p className="text-[0.8125rem] font-bold uppercase tracking-[0.24em] text-primary">{str(d.eyebrow)}</p>}
          <Heading className="heading mt-5 text-balance text-5xl sm:text-6xl">
            {str(d.heading)}
            {str(d.heading_accent) && <span className="text-primary"> {str(d.heading_accent)}</span>}
          </Heading>
          {str(d.subheading) && <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/75">{str(d.subheading)}</p>}
          {(primary || secondary) && (
            <div className="mt-9 flex flex-wrap gap-3">
              {primary && (
                <SmartLink href={primary.href} className={cn(pill.primary, "h-12 px-6")}>
                  {primary.label} <span aria-hidden>→</span>
                </SmartLink>
              )}
              {secondary && (
                <SmartLink href={secondary.href} className={cn(pill.ghostLight, "h-12 px-6")}>
                  {secondary.label}
                </SmartLink>
              )}
            </div>
          )}
        </div>
        {cats.length > 0 && (
          <nav aria-label={str(d.card_label) ?? "Program categories"} className="mt-8 border-t border-white/10 pt-6">
            {str(d.card_label) && <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/50">{str(d.card_label)}</p>}
            <ul className="flex flex-wrap gap-2.5">
              {cats.map((c) => (
                <li key={c.id}>
                  <a href={`#cat-${c.slug}`} className="inline-flex items-center gap-2.5 rounded-full bg-white/[0.07] py-2 pl-4 pr-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-primary hover:text-ink">
                    {c.name}
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/10 px-1.5 text-xs">{c.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </Container>
    </section>
  );
}

/** Editorial hero: centered statement, a wide rounded photo band, and small fact chips. */
function CenteredHero({ data: d, id, first }: { data: Data; id?: string; first: boolean }) {
  const primary = link(d.primary_cta);
  const secondary = link(d.secondary_cta);
  const Heading = first ? "h1" : "h2";
  const img = str(d.image_url);
  const facts = ((Array.isArray(d.facts) ? d.facts : []) as Data[]).filter((f) => str(f.value));
  return (
    <section id={id} className="relative overflow-hidden bg-surface">
      <FloatingShapes variant="c" />
      <Container className="relative pb-8 pt-10 text-center sm:pt-14">
        {str(d.eyebrow) && (
          <p className="inline-flex items-center gap-3 text-[0.8125rem] font-bold uppercase tracking-[0.28em] text-[#5f8500]">
            <span className="h-px w-10 bg-[#5f8500]/50" aria-hidden /> {str(d.eyebrow)} <span className="h-px w-10 bg-[#5f8500]/50" aria-hidden />
          </p>
        )}
        <Heading className="display mx-auto mt-5 max-w-5xl text-balance text-4xl sm:text-6xl lg:text-7xl">
          <span className="text-ink">{str(d.heading)}</span>
          {str(d.heading_accent) && (
            <>
              {" "}
              <span className="relative whitespace-nowrap text-ink">
                <span className="relative z-10">{str(d.heading_accent)}</span>
                <span aria-hidden className="absolute inset-x-0 bottom-[0.08em] z-0 h-[0.32em] rounded-full bg-primary/80" />
              </span>
            </>
          )}
        </Heading>
        {str(d.subheading) && <p className="mx-auto mt-5 max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground">{str(d.subheading)}</p>}
        {(primary || secondary) && (
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {primary && (
              <SmartLink href={primary.href} className={pill.dark}>
                {primary.label} <span aria-hidden>→</span>
              </SmartLink>
            )}
            {secondary && (
              <SmartLink href={secondary.href} className={pill.outline}>
                {secondary.label}
              </SmartLink>
            )}
          </div>
        )}
      </Container>
      <Container className="relative pb-10 sm:pb-14">
        <div className="relative">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[2.5rem] shadow-[0_40px_80px_-40px_rgba(18,53,46,0.5)] sm:aspect-[21/8]">
            {img ? (
              <Image src={img} alt={str(d.image_alt) ?? ""} fill preload={first} sizes="100vw" className="object-cover" />
            ) : (
              <PhotoPlaceholder className="absolute inset-0" />
            )}
          </div>
          {facts.length > 0 && (
            <ul className="relative z-10 mx-auto -mt-10 grid max-w-4xl gap-3 px-4 sm:-mt-14 sm:grid-cols-3">
              {facts.map((f, i) => (
                <li key={i} className="rounded-3xl bg-white px-6 py-5 text-center shadow-xl">
                  <p className="heading text-2xl text-ink sm:text-3xl">{str(f.value)}</p>
                  {str(f.label) && <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{str(f.label)}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}

function Cards({ data: d, wrap, headingId }: { data: Data; wrap: (c: React.ReactNode, o?: { narrow?: boolean; shapes?: "a" | "b" | "c" }) => React.ReactNode; headingId: string }) {
  const items = (Array.isArray(d.items) ? d.items : []) as Data[];
  if (!items.length) return null;
  const style = str(d.style) ?? "plain";
  const heading = <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} id={headingId} center={style === "timeline"} />;

  if (style === "timeline") {
    // "Chapters": numbered markers on a centre spine; date badge pinned to each photo; text in a soft card.
    return wrap(
      <>
        {heading}
        <ol className="relative">
          <span aria-hidden className="absolute bottom-6 left-5 top-6 w-px bg-gradient-to-b from-primary via-secondary/30 to-primary lg:left-1/2" />
          {items.map((it, i) => {
            const right = i % 2 === 1;
            const img = str(it.image_url);
            const date = str(it.date_label);
            const n = String(i + 1).padStart(2, "0");
            return (
              <li key={i} className="relative grid items-center gap-5 pb-12 pl-14 last:pb-0 lg:grid-cols-2 lg:gap-24 lg:pl-0">
                <span
                  aria-hidden
                  className="absolute left-5 top-0 flex size-10 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-primary ring-8 ring-surface lg:left-1/2 lg:top-1/2 lg:size-12 lg:-translate-y-1/2"
                >
                  {n}
                </span>

                <div className={cn("relative", right ? "lg:order-2" : "lg:order-1")}>
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-white p-6 shadow-[0_24px_50px_-30px_rgba(18,53,46,0.35)] sm:p-8">
                    <span aria-hidden className={cn("absolute inset-y-0 w-1.5 bg-primary", right ? "left-0" : "left-0 lg:left-auto lg:right-0")} />
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      Chapter {n}
                      {!img && date && <span className="text-secondary"> · {date}</span>}
                    </p>
                    {str(it.subtitle) && (
                      <p className="mt-3 inline-flex rounded-full bg-primary-soft px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#4d6b00]">{str(it.subtitle)}</p>
                    )}
                    <h3 className="heading mt-3 text-balance text-2xl text-ink sm:text-[1.75rem]">{str(it.title)}</h3>
                    {str(it.body) && <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{str(it.body)}</p>}
                  </div>
                </div>

                <div className={cn(right ? "lg:order-1" : "lg:order-2")}>
                  {img ? (
                    <figure className="relative">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-30px_rgba(18,53,46,0.5)]">
                        <Image src={img} alt={str(it.image_alt) ?? ""} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover transition duration-700 hover:scale-[1.03]" loading="lazy" />
                      </div>
                      {date && (
                        <figcaption className={cn("absolute -bottom-4 rounded-2xl bg-primary px-5 py-2.5 text-lg font-extrabold text-ink shadow-lg", right ? "right-6" : "left-6")}>
                          {date}
                        </figcaption>
                      )}
                    </figure>
                  ) : (
                    date && <p className={cn("display hidden text-6xl text-ink/10 lg:block xl:text-7xl", right ? "lg:text-right" : "")}>{date}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </>,
    );
  }

  if (style === "team") {
    return wrap(
      <>
        {heading}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6" aria-label={str(d.heading) ?? "Team"}>
          {items.map((it, i) => {
            const img = str(it.image_url);
            const name = str(it.title) ?? "";
            return (
              <li key={i} className="w-72 shrink-0 snap-start sm:w-80">
                <article className="h-full overflow-hidden rounded-3xl border border-border bg-white">
                  <div className="relative aspect-[4/5] bg-secondary">
                    {img ? (
                      <Image src={img} alt={`${name}${str(it.subtitle) ? `, ${str(it.subtitle)}` : ""}`} fill sizes="320px" className="object-cover" loading="lazy" />
                    ) : (
                      <span aria-hidden className="display absolute inset-0 flex items-center justify-center text-7xl text-primary">
                        {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    {str(it.quote) && <p className="text-base italic leading-relaxed text-foreground/80">“{str(it.quote)}”</p>}
                    <h3 className="heading mt-4 text-xl text-ink">{name}</h3>
                    {str(it.subtitle) && <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-[#5f8500]">{str(it.subtitle)}</p>}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </>,
    );
  }

  if (style === "statement") {
    return wrap(
      <>
        {heading}
        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((it, i) => {
            const dark = i % 2 === 0;
            return (
              <article key={i} className="group relative overflow-hidden rounded-[1.75rem] border border-border bg-white p-7 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(18,53,46,0.35)] sm:p-9">
                <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1.5", dark ? "bg-ink" : "bg-primary")} />
                <div className="flex items-center gap-4">
                  {str(it.icon) && (
                    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", dark ? "bg-ink text-primary" : "bg-primary text-ink")}>
                      <CmsIcon name={str(it.icon)} className="size-5" />
                    </span>
                  )}
                  <h3 className="heading text-xl text-ink sm:text-2xl">{str(it.title)}</h3>
                </div>
                {str(it.body) && <p className="mt-5 text-pretty text-[1.0625rem] leading-relaxed text-muted-foreground">{str(it.body)}</p>}
              </article>
            );
          })}
        </div>
      </>,
    );
  }

  if (style === "bento") {
    return wrap(
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="relative overflow-hidden rounded-[2rem] bg-ink p-9 text-white sm:col-span-2 sm:p-11">
          <FloatingShapes variant="a" />
          <div className="relative">
            {str(d.eyebrow) && <p className="text-[0.8125rem] font-bold uppercase tracking-[0.22em] text-primary">{str(d.eyebrow)}</p>}
            {str(d.heading) && <h2 id={headingId} className="heading mt-4 text-4xl sm:text-5xl">{str(d.heading)}</h2>}
            {str(d.intro) && <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/75">{str(d.intro)}</p>}
          </div>
        </li>
        {items.map((it, i) => (
          <li key={i} className="group flex flex-col rounded-[2rem] border border-border bg-white p-8 transition-shadow hover:shadow-[0_24px_50px_-24px_rgba(18,53,46,0.3)]">
            <span className={cn("flex size-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110", TILE_TONES[i % TILE_TONES.length])}>
              {str(it.icon) ? <CmsIcon name={str(it.icon)} className="size-5" /> : <span className="text-sm font-bold" aria-hidden>{i + 1}</span>}
            </span>
            <h3 className="heading mt-6 text-2xl text-ink">{str(it.title)}</h3>
            {str(it.body) && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{str(it.body)}</p>}
          </li>
        ))}
      </ul>,
    );
  }

  if (style === "list") {
    return wrap(
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} id={headingId} />
        </div>
        <ol className="divide-y divide-border border-y border-border">
          {items.map((it, i) => (
            <li key={i} className="group grid grid-cols-[auto_1fr] items-baseline gap-6 py-7 sm:gap-10">
              <span className="display text-4xl text-ink/15 transition-colors group-hover:text-primary sm:text-5xl" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="heading text-2xl text-ink sm:text-3xl">{str(it.title)}</h3>
                {str(it.body) && <p className="mt-2 text-lg leading-relaxed text-muted-foreground">{str(it.body)}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>,
    );
  }

  if (style === "chips") {
    return wrap(
      <div className="text-center">
        <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} id={headingId} center />
        <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3 sm:gap-4">
          {items.map((it, i) => (
            <li key={i} className="inline-flex items-center gap-3 rounded-full border border-border bg-white py-3 pl-3 pr-6 text-lg font-semibold text-ink shadow-sm sm:text-xl">
              <span className={cn("flex size-11 items-center justify-center rounded-full", TILE_TONES[i % TILE_TONES.length])}>
                {str(it.icon) ? <CmsIcon name={str(it.icon)} className="size-5" /> : <span className="size-2 rounded-full bg-current" aria-hidden />}
              </span>
              {str(it.title)}
            </li>
          ))}
        </ul>
      </div>,
    );
  }

  if (style === "numbered") {
    return wrap(
      <>
        {heading}
        <ol className={cn("relative grid gap-10 sm:grid-cols-2", items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          <span aria-hidden className="absolute left-8 right-8 top-8 hidden h-0.5 bg-[repeating-linear-gradient(90deg,var(--secondary)_0_8px,transparent_8px_16px)] opacity-25 lg:block" />
          {items.map((it, i) => (
            <li key={i} className="relative">
              <span className="relative z-10 flex size-16 items-center justify-center rounded-full bg-ink text-2xl font-extrabold text-primary ring-8 ring-surface" aria-hidden>
                {i + 1}
              </span>
              <h3 className="heading mt-6 text-2xl text-ink sm:text-3xl">
                <span className="sr-only">Step {i + 1}: </span>
                {str(it.title)}
              </h3>
              {str(it.body) && <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{str(it.body)}</p>}
            </li>
          ))}
        </ol>
      </>,
    );
  }

  const cols = Number(d.columns) || 3;
  return wrap(
    <>
      {heading}
      <ul className={cn("grid gap-6 sm:grid-cols-2", cols >= 3 && "lg:grid-cols-3", cols >= 4 && "xl:grid-cols-4")}>
        {items.map((item, i) => {
          const l = link(item.link);
          const img = str(item.image_url);
          return (
            <li key={i} className="group relative flex flex-col rounded-[1.75rem] border border-border bg-white p-8 transition-shadow hover:shadow-[0_24px_50px_-24px_rgba(18,53,46,0.3)]">
              {img && (
                <div className="relative -mx-8 -mt-8 mb-6 aspect-[4/3] overflow-hidden rounded-t-[1.75rem] bg-muted">
                  <Image src={img} alt="" fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover" />
                </div>
              )}
              {str(item.icon) && (
                <span className={cn("flex size-14 items-center justify-center rounded-2xl", TILE_TONES[i % TILE_TONES.length])}>
                  <CmsIcon name={str(item.icon)} className="size-6" />
                </span>
              )}
              {str(item.subtitle) && <p className="mt-6 text-[0.8125rem] font-bold uppercase tracking-[0.2em] text-[#5f8500]">{str(item.subtitle)}</p>}
              <h3 className={cn("heading text-2xl text-ink", str(item.subtitle) ? "mt-2" : str(item.icon) && "mt-6")}>{str(item.title)}</h3>
              {str(item.body) && <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]">{str(item.body)}</p>}
              {l && <ArrowLink href={l.href} className="mt-auto pt-6">{l.label}</ArrowLink>}
            </li>
          );
        })}
      </ul>
    </>,
  );
}

function Cta({ data: d, id }: { data: Data; id?: string }) {
  const tone = d.tone === "light" ? "light" : d.tone === "accent" ? "accent" : "dark";
  const primary = link(d.primary_cta);
  const secondary = link(d.secondary_cta);
  return (
    <section id={id} className="scroll-mt-24 bg-surface py-6 sm:py-8">
      <Container>
        <div
          className={cn(
            "relative overflow-hidden rounded-[2.5rem] px-7 py-10 sm:px-12 sm:py-12",
            tone === "light" && "border border-border bg-white",
            tone === "dark" && "bg-ink text-white",
            tone === "accent" && "bg-primary text-ink",
          )}
        >
          <FloatingShapes variant={tone === "dark" ? "a" : "c"} />
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className={cn("heading text-balance text-4xl sm:text-5xl", tone === "light" && "text-ink")}>{str(d.heading)}</h2>
              {str(d.body) && <p className={cn("mt-3 text-pretty text-lg leading-relaxed", tone === "dark" ? "text-white/75" : "text-ink/75")}>{str(d.body)}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              {primary && (
                <SmartLink href={primary.href} className={tone === "accent" ? pill.dark : pill.primary}>
                  {primary.label} <span aria-hidden>→</span>
                </SmartLink>
              )}
              {secondary && (
                <SmartLink href={secondary.href} className={tone === "dark" ? pill.ghostLight : pill.outline}>
                  {secondary.label}
                </SmartLink>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

async function Grid({ section, wrap, headingId }: { section: CmsSection; wrap: (c: React.ReactNode, o?: { narrow?: boolean; shapes?: "a" | "b" | "c" }) => React.ReactNode; headingId: string }) {
  const d = section.data;
  const t = await getTranslations("site");
  let items: React.ReactNode[] = [];

  switch (section.type) {
    case "program_grid":
      items = pickItems(await getPrograms(), d.mode, d.ids, d.limit).map((p, i) => <ProgramCard key={p.id} program={p} index={i} />);
      break;
    case "event_grid": {
      const pool = d.mode === "selected" ? await getEvents() : d.mode === "featured" ? (await getUpcomingEvents()).filter((e) => e.is_featured) : await getUpcomingEvents();
      items = pickItems(pool, d.mode === "featured" ? "latest" : d.mode, d.ids, d.limit).map((e) => <EventCard key={e.id} event={e} />);
      break;
    }
    case "opportunity_grid": {
      items = pickItems(await getOpenOpportunities(), d.mode, d.ids, d.limit).map((o) => <OpportunityCard key={o.id} opp={o} />);
      break;
    }
    case "story_grid":
      items = pickItems(await getStories(), d.mode, d.ids, d.limit).map((s) => <StoryCard key={s.id} story={s} />);
      break;
    case "project_grid":
      items = pickItems(await getProjects(), d.mode, d.ids, d.limit).map((p) => <ProjectCard key={p.id} project={p} />);
      break;
    case "resource_grid":
      items = pickItems(await getResources(), d.mode, d.ids, d.limit).map((r) => <ResourceCard key={r.id} resource={r} />);
      break;
  }

  if (!items.length && d.hide_when_empty) return null;
  const cta = link(d.cta);
  return wrap(
    <>
      <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} link={items.length ? cta : null} id={headingId} />
      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items}</div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <p className="text-lg text-muted-foreground">{str(d.empty_text) ?? t("nothingYet")}</p>
          {cta && <ArrowLink href={cta.href} className="mt-4">{cta.label}</ArrowLink>}
        </div>
      )}
    </>,
  );
}

/** Quote text without any quote marks the editor already typed (we add our own). */
const bareQuote = (q: string) => q.trim().replace(/^[“"'‘]+|[”"'’]+$/g, "").trim();

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("");

/**
 * Stories: heading on the left, the lead story as a large dark "spotlight" card on the right,
 * any further stories as compact rows underneath.
 */
async function StorySpotlight({ data: d, wrap, headingId }: { data: CmsSection["data"]; wrap: (c: React.ReactNode, o?: { narrow?: boolean; shapes?: "a" | "b" | "c" }) => React.ReactNode; headingId: string }) {
  const [stories, t] = await Promise.all([getStories(), getTranslations("site")]);
  const items = pickItems(stories, d.mode, d.ids, d.limit) as Story[];
  if (!items.length && d.hide_when_empty) return null;
  const cta = link(d.cta);
  const [lead, ...more] = items;

  return wrap(
    <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
      <div>
        {str(d.eyebrow) && <Eyebrow>{str(d.eyebrow)}</Eyebrow>}
        {str(d.heading) && <h2 id={headingId} className="heading mt-2 text-balance text-3xl text-ink sm:text-4xl lg:text-5xl">{str(d.heading)}</h2>}
        {str(d.intro) && <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">{str(d.intro)}</p>}
        <span aria-hidden className="mt-8 block h-1.5 w-20 rounded-full bg-primary" />
        {cta && items.length > 0 && <ArrowLink href={cta.href} className="mt-8">{cta.label}</ArrowLink>}
      </div>

      <div>
        {lead ? (
          <>
            <article className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-white shadow-[0_40px_80px_-40px_rgba(18,53,46,0.6)] sm:p-10">
              <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/15 blur-2xl" />
              <span aria-hidden className="absolute -bottom-10 right-10 size-28 rounded-full border-[10px] border-primary/20" />
              <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary text-ink">
                <Quote className="size-6" aria-hidden />
              </span>
              <blockquote className="heading relative mt-6 text-pretty text-2xl leading-snug sm:text-3xl">“{bareQuote(lead.quote || lead.introduction || lead.title)}”</blockquote>
              <div className="relative mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
                <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-lg font-bold text-primary ring-2 ring-primary">
                  {lead.profile_image_url ? <Image src={lead.profile_image_url} alt="" fill sizes="64px" className="object-cover" /> : <span aria-hidden>{initials(lead.person_name)}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{lead.person_name}</p>
                  <h3 className="mt-0.5 text-sm text-white/65">{lead.title}</h3>
                </div>
                <Link href={`/stories/${lead.slug}`} className={cn(pill.primary, "h-11 px-5 text-sm")}>
                  {t("readStory")} <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </div>
            </article>
            {more.length > 0 && (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {more.map((s) => (
                  <li key={s.id}>
                    <Link href={`/stories/${s.slug}`} className="group flex h-full gap-4 rounded-3xl border border-border bg-white p-5 transition hover:border-secondary/30 hover:shadow-lg">
                      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-sm font-bold text-primary">
                        {s.profile_image_url ? <Image src={s.profile_image_url} alt="" fill sizes="48px" className="object-cover" /> : <span aria-hidden>{initials(s.person_name)}</span>}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-ink/85">“{bareQuote(s.quote || s.introduction || s.title)}”</span>
                        <span className="mt-2 block text-sm font-bold text-ink group-hover:text-secondary">{s.person_name}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-white px-6 py-14 text-center">
            <p className="text-lg text-muted-foreground">{str(d.empty_text) ?? t("nothingYet")}</p>
          </div>
        )}
      </div>
    </div>,
  );
}

/** YouTube / Vimeo URL → privacy-friendly embed URL (anything else is ignored). */
function videoEmbed(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) id = u.searchParams.get("v") ?? (u.pathname.match(/\/(embed|shorts)\/([\w-]{6,})/)?.[2] ?? null);
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const v = u.pathname.match(/(\d{6,})/)?.[1];
      if (v) return `https://player.vimeo.com/video/${v}`;
    }
  } catch {
    // not a URL
  }
  return null;
}
