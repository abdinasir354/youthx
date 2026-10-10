import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, ChevronDown, Quote } from "lucide-react";
import { getEvents, getFaqs, getPartnerLogos, getProgramCategories, getProjects, getPrograms, getResources, getStories, getUpcomingEvents, pickItems } from "@/lib/data/cms";
import { getImpactStats, getOpenOpportunities } from "@/lib/data/public";
import { markdownToSafeHtml } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import type { CmsSection, Story } from "@/types/cms";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { ArrowLink, Container, Eyebrow, RichText, SectionHeading, SmartLink, pill } from "@/components/site/basics";
import { Link } from "@/i18n/navigation";
import { EventCard, ProgramCard, ProjectCard, ResourceCard, StoryCard } from "@/components/site/cards";
import { StoryDetail } from "@/components/site/detail-pages";
import { PhotoPlaceholder } from "@/components/site/shapes";
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
    <section id={id} aria-labelledby={labelledBy} className={cn("relative scroll-mt-24 overflow-hidden py-10 sm:py-12", tone === "white" ? "bg-white" : "bg-surface")}>
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
        <div data-reveal>
          {str(d.eyebrow) && <Eyebrow>{str(d.eyebrow)}</Eyebrow>}
          <h2 id={headingId} className="heading mt-3 text-balance text-2xl text-ink sm:text-3xl lg:text-4xl">{str(d.heading)}</h2>
          <RichText markdown={str(d.body)} className="mt-4 [&>p:first-child]:text-lg [&>p:not(:first-child)]:text-base [&>p:not(:first-child)]:text-muted-foreground" />
          {cta && (
            <SmartLink href={cta.href} className={cn(pill.outline, "mt-6")}>
              {cta.label} <span aria-hidden>→</span>
            </SmartLink>
          )}
        </div>
      );
      const media = (
        <div data-reveal="image" className="relative">
          <div className="group relative aspect-[4/3] overflow-hidden rounded-xl">
            {image ? (
              <Image src={image} alt={str(d.image_alt) ?? ""} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]" />
            ) : (
              <PhotoPlaceholder className="absolute inset-0" />
            )}
          </div>
          {stat && (
            <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-white px-4 py-3">
              <p className="heading text-2xl text-ink sm:text-3xl">{stat}</p>
              {str(d.stat_label) && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{str(d.stat_label)}</p>}
            </div>
          )}
        </div>
      );
      return wrap(
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
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
          <div data-reveal className="divide-y divide-border rounded-xl border border-border bg-white">
            {faqs.map((f) => (
              <details key={f.id} className="group px-6 py-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-ink transition-colors duration-300 hover:text-secondary sm:text-lg">
                  {f.question}
                  <ChevronDown className="size-5 shrink-0 transition-transform duration-300 ease-soft group-open:rotate-180" aria-hidden />
                </summary>
                <div className="prose-cms pb-5 text-base text-foreground/85" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(f.answer) }} />
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
        <section id={id} aria-labelledby={labelledBy} className="relative scroll-mt-24 overflow-hidden bg-ink py-10 text-white sm:py-12">
          <Container className="relative">
            <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} invert id={headingId} />
            <dl data-reveal-stagger className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {items.map((it) => (
                <div key={it.label} className="border-l-2 border-primary pl-4 transition duration-[350ms] ease-soft hover:-translate-y-1">
                  <dd className="heading text-3xl tabular-nums text-white sm:text-4xl">{typeof it.value === "number" ? it.value.toLocaleString("en-GB") : it.value}</dd>
                  <dt className="mt-1 text-sm text-white/70">{it.label}</dt>
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
          <ul data-reveal-stagger className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {images.map((img, i) => (
              <li key={i}>
                <figure>
                  <div className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <Image src={str(img.url)!} alt={str(img.alt) ?? ""} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" loading="lazy" />
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
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
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
          <ul data-reveal-stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {partners.map((p) => {
              const inner = p.logo_url ? (
                <span className="relative block h-14 w-full">
                  <Image src={p.logo_url} alt={p.name} fill sizes="200px" className="object-contain grayscale transition duration-500 group-hover:grayscale-0" />
                </span>
              ) : (
                <span className="text-center font-semibold text-ink">{p.name}</span>
              );
              return (
                <li key={p.id} className="group flex h-28 items-center justify-center rounded-xl border border-border bg-white p-5 transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30">
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
    <section id={id} className="border-b border-border bg-surface">
      <Container className="grid items-center gap-8 py-10 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="enter-up">
          {str(d.eyebrow) && <Eyebrow>{str(d.eyebrow)}</Eyebrow>}
          <Heading className="display mt-3 text-balance text-4xl sm:text-5xl xl:text-[3.5rem]">
            <span className="text-ink">{str(d.heading)}</span>
            {str(d.heading_accent) && (
              <>
                {" "}
                <span className="block text-[#5f8500]">{str(d.heading_accent)}</span>
              </>
            )}
          </Heading>
          {str(d.subheading) && <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">{str(d.subheading)}</p>}
          {(primary || secondary) && (
            <div className="mt-8 flex flex-wrap gap-3">
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

        {/* Two photos side by side, with the stat and mission line underneath */}
        <div className="enter-up enter-up-2">
          <div className="grid grid-cols-[3fr_2fr] gap-3">
            <div className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
              {img1 ? (
                <Image src={img1} alt={str(d.image_alt) ?? ""} fill preload={first} sizes="(min-width: 1024px) 28vw, 60vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" />
              ) : (
                <PhotoPlaceholder className="absolute inset-0" />
              )}
            </div>
            <div className="group relative aspect-[4/5] self-end overflow-hidden rounded-xl bg-muted">
              {img2 ? (
                <Image src={img2} alt={str(d.image2_alt) ?? ""} fill sizes="(min-width: 1024px) 18vw, 40vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" />
              ) : (
                <PhotoPlaceholder tone="lime" className="absolute inset-0" />
              )}
            </div>
          </div>
          {(str(d.stat_value) || str(d.card_text)) && (
            <dl className="mt-4 flex divide-x divide-border border-t border-border pt-4 [&>div:first-child]:pl-0">
              {str(d.stat_value) && (
                <div className="pr-5">
                  <dt className="text-xs font-medium text-muted-foreground">{str(d.stat_label)}</dt>
                  <dd className="heading mt-0.5 text-2xl text-ink">{str(d.stat_value)}</dd>
                </div>
              )}
              {str(d.card_text) && (
                <div className="flex-1 pl-5">
                  <dt className="text-xs font-medium text-muted-foreground">{str(d.card_label)}</dt>
                  <dd className="mt-1 text-base font-semibold text-ink">{str(d.card_text)}</dd>
                </div>
              )}
            </dl>
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
      <Container className="relative py-8 sm:py-10">
        <div className="enter-up max-w-3xl">
          {str(d.eyebrow) && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{str(d.eyebrow)}</p>}
          <Heading className="heading mt-5 text-balance text-4xl sm:text-5xl">
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
          <nav aria-label={str(d.card_label) ?? "Program categories"} className="enter-up enter-up-2 mt-8 border-t border-white/10 pt-6">
            {str(d.card_label) && <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">{str(d.card_label)}</p>}
            <ul className="flex flex-wrap gap-2.5">
              {cats.map((c) => (
                <li key={c.id}>
                  <a href={`#cat-${c.slug}`} className="inline-flex items-center gap-2.5 rounded-full bg-white/[0.07] py-2 pl-4 pr-2 text-sm font-semibold text-white ring-1 ring-white/10 transition duration-300 ease-soft hover:-translate-y-0.5 hover:bg-primary hover:text-ink">
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
      <Container className="enter-up relative pb-8 pt-8 text-center sm:pt-10">
        {str(d.eyebrow) && (
          <p className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-[#5f8500]">
            <span className="h-px w-10 bg-[#5f8500]/50" aria-hidden /> {str(d.eyebrow)} <span className="h-px w-10 bg-[#5f8500]/50" aria-hidden />
          </p>
        )}
        <Heading className="display mx-auto mt-4 max-w-5xl text-balance text-3xl sm:text-4xl lg:text-5xl">
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
      <Container className="enter-up enter-up-2 relative pb-8 sm:pb-10">
        <div className="relative">
          <div className="group relative aspect-[16/9] overflow-hidden rounded-2xl sm:aspect-[21/8]">
            {img ? (
              <Image src={img} alt={str(d.image_alt) ?? ""} fill preload={first} sizes="100vw" className="object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.03]" />
            ) : (
              <PhotoPlaceholder className="absolute inset-0" />
            )}
          </div>
          {facts.length > 0 && (
            <ul className="relative z-10 mx-auto -mt-10 grid max-w-4xl gap-3 px-4 sm:-mt-14 sm:grid-cols-3">
              {facts.map((f, i) => (
                <li key={i} className="rounded-xl border border-border bg-white px-6 py-5 text-center transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30">
                  <p className="heading text-2xl text-ink sm:text-3xl">{str(f.value)}</p>
                  {str(f.label) && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{str(f.label)}</p>}
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

                <div data-reveal className={cn("relative", right ? "lg:order-2" : "lg:order-1")}>
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-white p-6 shadow-[0_24px_50px_-30px_rgba(18,53,46,0.35)] transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-primary/50 sm:p-8">
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
                    <figure data-reveal="image" className="relative">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-30px_rgba(18,53,46,0.5)]">
                        <Image src={img} alt={str(it.image_alt) ?? ""} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover transition-transform duration-700 ease-soft hover:scale-[1.04]" loading="lazy" />
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
                <article className="group h-full overflow-hidden rounded-xl border border-border bg-white transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30">
                  <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                    {img ? (
                      <Image src={img} alt={`${name}${str(it.subtitle) ? `, ${str(it.subtitle)}` : ""}`} fill sizes="320px" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" loading="lazy" />
                    ) : (
                      <span aria-hidden className="heading absolute inset-0 flex items-center justify-center text-4xl text-primary">
                        {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    {str(it.quote) && <p className="text-base italic leading-relaxed text-foreground/80">“{str(it.quote)}”</p>}
                    <h3 className="mt-3 text-lg font-semibold text-ink">{name}</h3>
                    {str(it.subtitle) && <p className="mt-0.5 text-sm text-muted-foreground">{str(it.subtitle)}</p>}
                    {str(it.body) && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{str(it.body)}</p>}
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
        <div data-reveal-stagger className="grid gap-5 lg:grid-cols-2">
          {items.map((it, i) => {
            const dark = i % 2 === 0;
            return (
              <article key={i} className="group rounded-xl border border-border bg-white p-6 transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30">
                <div className="flex items-center gap-4">
                  {str(it.icon) && (
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 ease-soft group-hover:scale-110", dark ? "bg-ink text-primary" : "bg-primary-soft text-secondary")}>
                      <CmsIcon name={str(it.icon)} className="size-5" />
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-ink sm:text-xl">{str(it.title)}</h3>
                </div>
                {str(it.body) && <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{str(it.body)}</p>}
              </article>
            );
          })}
        </div>
      </>,
    );
  }

  if (style === "bento") {
    return wrap(
      <ul data-reveal-stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="rounded-xl bg-ink p-6 text-white sm:col-span-2 sm:p-8">
          <div>
            {str(d.eyebrow) && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{str(d.eyebrow)}</p>}
            {str(d.heading) && <h2 id={headingId} className="heading mt-2 text-2xl sm:text-3xl">{str(d.heading)}</h2>}
            {str(d.intro) && <p className="mt-3 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">{str(d.intro)}</p>}
          </div>
        </li>
        {items.map((it, i) => (
          <li key={i} className="group flex flex-col rounded-xl border border-border bg-white p-6 transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30">
            <span className={cn("flex size-10 items-center justify-center rounded-lg transition-transform duration-300 ease-soft group-hover:scale-110", TILE_TONES[i % TILE_TONES.length])}>
              {str(it.icon) ? <CmsIcon name={str(it.icon)} className="size-5" /> : <span className="text-sm font-semibold" aria-hidden>{i + 1}</span>}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-ink">{str(it.title)}</h3>
            {str(it.body) && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{str(it.body)}</p>}
          </li>
        ))}
      </ul>,
    );
  }

  if (style === "list") {
    return wrap(
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} id={headingId} />
        </div>
        <ol data-reveal-stagger className="divide-y divide-border border-y border-border">
          {items.map((it, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] items-baseline gap-4 py-5 sm:gap-6">
              <span className="text-sm font-semibold tabular-nums text-[#5f8500]" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-ink sm:text-xl">{str(it.title)}</h3>
                {str(it.body) && <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">{str(it.body)}</p>}
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
        <ul data-reveal-stagger className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2.5">
          {items.map((it, i) => (
            <li key={i} className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-white py-2 pl-2 pr-4 text-base font-medium text-ink transition duration-300 ease-soft hover:-translate-y-0.5 hover:border-primary">
              <span className={cn("flex size-8 items-center justify-center rounded-md", TILE_TONES[i % TILE_TONES.length])}>
                {str(it.icon) ? <CmsIcon name={str(it.icon)} className="size-4" /> : <span className="size-1.5 rounded-full bg-current" aria-hidden />}
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
        <ol data-reveal-stagger className={cn("relative grid gap-8 sm:grid-cols-2", items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          <span aria-hidden className="absolute left-5 right-5 top-5 hidden h-px bg-border lg:block" />
          {items.map((it, i) => (
            <li key={i} className="group relative">
              <span className="relative z-10 flex size-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-primary ring-4 ring-surface transition-transform duration-300 ease-soft group-hover:scale-110" aria-hidden>
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink sm:text-xl">
                <span className="sr-only">Step {i + 1}: </span>
                {str(it.title)}
              </h3>
              {str(it.body) && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{str(it.body)}</p>}
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
      <ul data-reveal-stagger className={cn("grid gap-6 sm:grid-cols-2", cols >= 3 && "lg:grid-cols-3", cols >= 4 && "xl:grid-cols-4")}>
        {items.map((item, i) => {
          const l = link(item.link);
          const img = str(item.image_url);
          return (
            <li key={i} className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white p-6 transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30">
              {img && (
                <div className="relative -mx-6 -mt-6 mb-5 aspect-[4/3] overflow-hidden bg-muted">
                  <Image src={img} alt="" fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" />
                </div>
              )}
              {str(item.icon) && (
                <span className={cn("flex size-10 items-center justify-center rounded-lg", TILE_TONES[i % TILE_TONES.length])}>
                  <CmsIcon name={str(item.icon)} className="size-5" />
                </span>
              )}
              {str(item.subtitle) && <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#5f8500]">{str(item.subtitle)}</p>}
              <h3 className={cn("text-lg font-semibold text-ink", str(item.subtitle) ? "mt-1" : str(item.icon) && "mt-4")}>{str(item.title)}</h3>
              {str(item.body) && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{str(item.body)}</p>}
              {l && <ArrowLink href={l.href} className="mt-auto pt-5">{l.label}</ArrowLink>}
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
          data-reveal
          className={cn(
            "rounded-2xl px-6 py-8 sm:px-10 sm:py-10",
            tone === "light" && "border border-border bg-white",
            tone === "dark" && "bg-ink text-white",
            tone === "accent" && "bg-primary text-ink",
          )}
        >
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className={cn("heading text-balance text-2xl sm:text-3xl", tone === "light" && "text-ink")}>{str(d.heading)}</h2>
              {str(d.body) && <p className={cn("mt-2 text-pretty text-base leading-relaxed sm:text-lg", tone === "dark" ? "text-white/75" : "text-ink/75")}>{str(d.body)}</p>}
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
        <div data-reveal-stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items}</div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
          <p className="text-lg text-muted-foreground">{str(d.empty_text) ?? t("nothingYet")}</p>
          {cta && <ArrowLink href={cta.href} className="mt-4">{cta.label}</ArrowLink>}
        </div>
      )}
    </>,
  );
}

/**
 * Stories as an alternating editorial list: photo left / text right, then text left / photo right…
 * Side by side from tablet width up; stacked (photo first) on phones.
 */
function StoryRows({ stories, readLabel }: { stories: Story[]; readLabel: string }) {
  return (
    <ul className="space-y-12 sm:space-y-16">
      {stories.map((s, i) => {
        const flip = i % 2 === 1;
        const quote = s.quote || s.introduction;
        return (
          <li key={s.id} className="grid items-center gap-6 md:grid-cols-2 md:gap-10 lg:gap-16">
            <figure data-reveal="image" className={cn("group relative", flip && "md:order-2")}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-muted shadow-[0_30px_60px_-30px_rgba(18,53,46,0.45)]">
                {s.profile_image_url ? (
                  <Image src={s.profile_image_url} alt={s.person_name} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]" />
                ) : (
                  <PhotoPlaceholder className="absolute inset-0" />
                )}
              </div>
            </figure>
            <div data-reveal className={cn(flip && "md:order-1")}>
              <p className="text-[0.8125rem] font-bold uppercase tracking-[0.2em] text-[#5f8500]">{s.person_name}</p>
              <h3 className="heading mt-3 text-balance text-2xl text-ink sm:text-3xl">{s.title}</h3>
              {quote && (
                <blockquote className="mt-5 border-l-4 border-primary pl-5 text-pretty text-lg leading-relaxed text-ink/85">“{bareQuote(quote)}”</blockquote>
              )}
              {s.quote && s.introduction && <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">{s.introduction}</p>}
              <ArrowLink href={`/stories/${s.slug}`} className="mt-6">{readLabel}</ArrowLink>
            </div>
          </li>
        );
      })}
    </ul>
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
  if (lead && d.display === "full") return <StoryDetail story={lead} embedded />;
  if (lead && d.display === "alternating") {
    return wrap(
      <>
        <SectionHeading eyebrow={str(d.eyebrow)} heading={str(d.heading)} intro={str(d.intro)} id={headingId} />
        <StoryRows stories={items} readLabel={t("readStory")} />
      </>,
    );
  }

  return wrap(
    <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
      <div data-reveal>
        {str(d.eyebrow) && <Eyebrow>{str(d.eyebrow)}</Eyebrow>}
        {str(d.heading) && <h2 id={headingId} className="heading mt-2 text-balance text-3xl text-ink sm:text-4xl lg:text-5xl">{str(d.heading)}</h2>}
        {str(d.intro) && <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">{str(d.intro)}</p>}
        <span aria-hidden className="mt-8 block h-1.5 w-20 rounded-full bg-primary" />
        {cta && items.length > 0 && <ArrowLink href={cta.href} className="mt-8">{cta.label}</ArrowLink>}
      </div>

      <div>
        {lead ? (
          <>
            <article data-reveal="image" className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-white shadow-[0_40px_80px_-40px_rgba(18,53,46,0.6)] transition duration-[400ms] ease-soft hover:-translate-y-1 hover:shadow-[0_50px_90px_-40px_rgba(18,53,46,0.7)] sm:p-10">
              <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/15 blur-2xl" />
              <span aria-hidden className="absolute -bottom-10 right-10 size-28 rounded-full border-[0.625rem] border-primary/20" />
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
              <ul data-reveal-stagger className="mt-4 grid gap-3 sm:grid-cols-2">
                {more.map((s) => (
                  <li key={s.id}>
                    <Link href={`/stories/${s.slug}`} className="group flex h-full gap-4 rounded-3xl border border-border bg-white p-5 transition duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30 hover:shadow-lg">
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
