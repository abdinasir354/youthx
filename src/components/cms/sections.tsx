import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { getEvents, getFaqs, getPartnerLogos, getProgramCategories, getProjects, getPrograms, getResources, getStories, getUpcomingEvents, pickItems } from "@/lib/data/cms";
import { getImpactStats, getOpenOpportunities } from "@/lib/data/public";
import { markdownToSafeHtml } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import type { CmsSection } from "@/types/cms";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { ArrowLink, Container, Eyebrow, RichText, SectionHeading, SmartLink, pill } from "@/components/site/basics";
import { EventCard, ProgramCard, ProjectCard, ResourceCard, StoryCard } from "@/components/site/cards";
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
        <div>
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
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            {image ? (
              <Image src={image} alt={str(d.image_alt) ?? ""} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
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

    case "program_grid":
    case "opportunity_grid":
    case "event_grid":
    case "story_grid":
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
          <div className="divide-y divide-border rounded-xl border border-border bg-white">
            {faqs.map((f) => (
              <details key={f.id} className="group px-6 py-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-ink sm:text-lg">
                  {f.question}
                  <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
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
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {items.map((it) => (
                <div key={it.label} className="border-l-2 border-primary pl-4">
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
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {images.map((img, i) => (
              <li key={i}>
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <Image src={str(img.url)!} alt={str(img.alt) ?? ""} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" loading="lazy" />
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
                <li key={p.id} className="flex h-28 items-center justify-center rounded-xl border border-border bg-white p-5">
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
        <div>
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
        <div>
          <div className="grid grid-cols-[3fr_2fr] gap-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
              {img1 ? (
                <Image src={img1} alt={str(d.image_alt) ?? ""} fill preload={first} sizes="(min-width: 1024px) 28vw, 60vw" className="object-cover" />
              ) : (
                <PhotoPlaceholder className="absolute inset-0" />
              )}
            </div>
            <div className="relative aspect-[4/5] self-end overflow-hidden rounded-xl bg-muted">
              {img2 ? (
                <Image src={img2} alt={str(d.image2_alt) ?? ""} fill sizes="(min-width: 1024px) 18vw, 40vw" className="object-cover" />
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
        <div className="max-w-3xl">
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
          <nav aria-label={str(d.card_label) ?? "Program categories"} className="mt-8 border-t border-white/10 pt-6">
            {str(d.card_label) && <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">{str(d.card_label)}</p>}
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
      <Container className="relative pb-8 pt-8 text-center sm:pt-10">
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
      <Container className="relative pb-8 sm:pb-10">
        <div className="relative">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl sm:aspect-[21/8]">
            {img ? (
              <Image src={img} alt={str(d.image_alt) ?? ""} fill preload={first} sizes="100vw" className="object-cover" />
            ) : (
              <PhotoPlaceholder className="absolute inset-0" />
            )}
          </div>
          {facts.length > 0 && (
            <ul className="relative z-10 mx-auto -mt-10 grid max-w-4xl gap-3 px-4 sm:-mt-14 sm:grid-cols-3">
              {facts.map((f, i) => (
                <li key={i} className="rounded-xl border border-border bg-white px-6 py-5 text-center">
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
    return wrap(
      <>
        {heading}
        <ol className="relative">
          <span aria-hidden className="absolute bottom-0 left-4 top-0 w-0.5 bg-border lg:left-1/2 lg:-translate-x-1/2" />
          {items.map((it, i) => {
            const right = i % 2 === 1;
            const img = str(it.image_url);
            return (
              <li key={i} className="relative grid gap-6 pb-10 pl-12 last:pb-0 lg:grid-cols-2 lg:gap-12 lg:pl-0">
                <span aria-hidden className="absolute left-4 top-1.5 size-3 -translate-x-1/2 rounded-full bg-secondary ring-4 ring-surface lg:left-1/2" />
                <div className={cn("lg:text-right", right && "lg:order-2 lg:text-left")}>
                  {str(it.date_label) && <p className="text-sm font-semibold text-[#5f8500]">{str(it.date_label)}</p>}
                  {str(it.subtitle) && (
                    <p className="mt-1 text-sm text-muted-foreground">{str(it.subtitle)}</p>
                  )}
                  <h3 className="heading mt-2 text-xl text-ink sm:text-2xl">{str(it.title)}</h3>
                  {str(it.body) && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{str(it.body)}</p>}
                </div>
                <div className={cn(right && "lg:order-1")}>
                  {img && (
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                      <Image src={img} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" loading="lazy" />
                    </div>
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
                <article className="h-full overflow-hidden rounded-xl border border-border bg-white">
                  <div className="relative aspect-[4/5] bg-secondary">
                    {img ? (
                      <Image src={img} alt={`${name}${str(it.subtitle) ? `, ${str(it.subtitle)}` : ""}`} fill sizes="320px" className="object-cover" loading="lazy" />
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
              <article key={i} className="rounded-xl border border-border bg-white p-6">
                <div className="flex items-center gap-4">
                  {str(it.icon) && (
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", dark ? "bg-ink text-primary" : "bg-primary-soft text-secondary")}>
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
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="rounded-xl bg-ink p-6 text-white sm:col-span-2 sm:p-8">
          <div>
            {str(d.eyebrow) && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{str(d.eyebrow)}</p>}
            {str(d.heading) && <h2 id={headingId} className="heading mt-2 text-2xl sm:text-3xl">{str(d.heading)}</h2>}
            {str(d.intro) && <p className="mt-3 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">{str(d.intro)}</p>}
          </div>
        </li>
        {items.map((it, i) => (
          <li key={i} className="flex flex-col rounded-xl border border-border bg-white p-6">
            <span className={cn("flex size-10 items-center justify-center rounded-lg", TILE_TONES[i % TILE_TONES.length])}>
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
        <ol className="divide-y divide-border border-y border-border">
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
        <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2.5">
          {items.map((it, i) => (
            <li key={i} className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-white py-2 pl-2 pr-4 text-base font-medium text-ink">
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
        <ol className={cn("relative grid gap-8 sm:grid-cols-2", items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          <span aria-hidden className="absolute left-5 right-5 top-5 hidden h-px bg-border lg:block" />
          {items.map((it, i) => (
            <li key={i} className="relative">
              <span className="relative z-10 flex size-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-primary ring-4 ring-surface" aria-hidden>
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
      <ul className={cn("grid gap-6 sm:grid-cols-2", cols >= 3 && "lg:grid-cols-3", cols >= 4 && "xl:grid-cols-4")}>
        {items.map((item, i) => {
          const l = link(item.link);
          const img = str(item.image_url);
          return (
            <li key={i} className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-white p-6">
              {img && (
                <div className="relative -mx-6 -mt-6 mb-5 aspect-[4/3] bg-muted">
                  <Image src={img} alt="" fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover" />
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items}</div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center">
          <p className="text-lg text-muted-foreground">{str(d.empty_text) ?? t("nothingYet")}</p>
          {cta && <ArrowLink href={cta.href} className="mt-4">{cta.label}</ArrowLink>}
        </div>
      )}
    </>,
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
