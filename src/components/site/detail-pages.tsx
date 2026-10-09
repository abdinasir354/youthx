import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CalendarDays, CheckCircle2, Download, ExternalLink, FileText, MapPin, Quote } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Program, Project, Resource, Story } from "@/types/cms";
import { buttonVariants } from "@/components/ui/button";
import { Container, Eyebrow, RichText, formatLongDate } from "./basics";

function Header({ eyebrow, title, intro, image }: { eyebrow: string; title: string; intro?: string | null; image?: string | null }) {
  return (
    <section className="relative overflow-hidden bg-surface">
      <Container className={image ? "grid items-center gap-10 py-10 sm:py-12 lg:grid-cols-[1.1fr_1fr]" : "py-10 sm:py-12"}>
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-2 display text-balance text-5xl text-ink sm:text-6xl">{title}</h1>
          {intro && <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">{intro}</p>}
        </div>
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-25px_rgba(18,53,46,0.4)]">
            <Image src={image} alt="" fill preload sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
        )}
      </Container>
    </section>
  );
}

function Block({ title, markdown, id }: { title: string; markdown: string | null; id: string }) {
  if (!markdown) return null;
  return (
    <section aria-labelledby={id} className="mt-12 first:mt-0">
      <h2 id={id} className="mb-4 text-2xl font-bold text-secondary">{title}</h2>
      <RichText markdown={markdown} />
    </section>
  );
}

function Checklist({ title, items, id }: { title: string; items: string[]; id: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="mb-4 text-2xl font-bold text-secondary">{title}</h2>
      <ul className="space-y-3">
        {items.map((o) => (
          <li key={o} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
            <span>{o}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function ProjectDetail({ project, program }: { project: Project; program?: Program }) {
  const t = await getTranslations("site");
  const dates = [project.start_date, project.end_date].filter(Boolean).map((d) => formatLongDate(d)).join(" – ");
  return (
    <>
      <Header eyebrow={t(`projectStatus.${project.project_status}`)} title={project.title} intro={project.summary} image={project.featured_image_url} />
      <Container className="grid gap-12 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <RichText markdown={project.description} className="mb-12" />
          <Block id="problem" title={t("theProblem")} markdown={project.problem} />
          <Block id="solution" title={t("ourSolution")} markdown={project.solution} />
          <Checklist id="objectives" title={t("objectives")} items={project.objectives} />
          <Checklist id="activities" title={t("activities")} items={project.activities} />
          <Block id="impact" title={t("impact")} markdown={project.impact} />
          {project.gallery.length > 0 && (
            <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3" aria-label={t("gallery")}>
              {project.gallery.map((src, i) => (
                <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                  <Image src={src} alt={`${project.title} — ${i + 1}`} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" loading="lazy" />
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="h-fit space-y-6 rounded-lg border border-border bg-muted/50 p-6 lg:sticky lg:top-24">
          <dl className="space-y-4 text-sm">
            {dates && (
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
                <div><dt className="sr-only">{t("dates")}</dt><dd className="text-secondary">{dates}</dd></div>
              </div>
            )}
            {project.location && (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
                <div><dt className="sr-only">{t("location")}</dt><dd className="text-secondary">{project.location}</dd></div>
              </div>
            )}
          </dl>
          {program && (
            <p className="text-sm text-muted-foreground">
              {t("partOf")} <Link href={`/programs/${program.slug}`} className="font-semibold text-secondary underline">{program.title}</Link>
            </p>
          )}
          {project.documents.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-bold text-secondary">{t("documents")}</h2>
              <ul className="space-y-1.5">
                {project.documents.map((d) => (
                  <li key={d.url}>
                    <a href={d.url} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-secondary underline-offset-2 hover:underline">
                      <FileText className="size-4 shrink-0" aria-hidden /> {d.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project.partners && project.partners.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-bold text-secondary">{t("partners")}</h2>
              <ul className="space-y-1 text-sm text-secondary">
                {project.partners.map((p) => (
                  <li key={p.id}>{p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="underline">{p.name}</a> : p.name}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </Container>
    </>
  );
}

export async function ResourceDetail({ resource }: { resource: Resource }) {
  const t = await getTranslations("site");
  return (
    <>
      <Header eyebrow={t(`resourceTypes.${resource.resource_type}`)} title={resource.title} intro={resource.description} image={resource.cover_image_url} />
      <Container className="grid gap-12 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {resource.body ? <RichText markdown={resource.body} /> : !resource.file_url && !resource.external_url && <p className="text-muted-foreground">{resource.description}</p>}
        </div>
        <aside className="h-fit space-y-4 rounded-lg border border-border bg-muted/50 p-6 lg:sticky lg:top-24">
          {resource.file_url && (
            <a href={resource.file_url} target="_blank" rel="noopener" className={buttonVariants({ size: "lg", className: "w-full" })}>
              <Download /> {t("download")}
            </a>
          )}
          {resource.external_url && (
            <a href={resource.external_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: resource.file_url ? "outline" : "default", size: "lg", className: "w-full" })}>
              <ExternalLink /> {resource.resource_type === "video" ? t("watch") : t("openLink")}
            </a>
          )}
          <dl className="space-y-2 text-sm">
            {resource.author && (<><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("author")}</dt><dd className="text-secondary">{resource.author}</dd></>)}
            {resource.category && (<><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("category")}</dt><dd className="text-secondary">{resource.category.name}</dd></>)}
            {resource.published_at && (<><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("published")}</dt><dd className="text-secondary">{formatLongDate(resource.published_at)}</dd></>)}
          </dl>
        </aside>
      </Container>
    </>
  );
}

/**
 * Splits a story body into chapters. A chapter starts at a Markdown heading ("## …") or at a short
 * stand-alone line without a full stop (how editors usually type headings in plain text).
 */
function storyChapters(body: string | null): { title: string | null; markdown: string }[] {
  if (!body?.trim()) return [];
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const isHeading = (b: string) => /^#{1,4}\s/.test(b) || (!b.includes("\n") && b.length <= 80 && !/[.!?:;,]$/.test(b));
  const chapters: { title: string | null; parts: string[] }[] = [];
  for (const b of blocks) {
    if (isHeading(b)) chapters.push({ title: b.replace(/^#{1,4}\s+/, ""), parts: [] });
    else if (chapters.length) chapters[chapters.length - 1].parts.push(b);
    else chapters.push({ title: null, parts: [b] });
  }
  return chapters.map((c) => ({ title: c.title, markdown: c.parts.join("\n\n") }));
}

/** Quote text without any quote marks the editor already typed (we add our own). */
const bareQuote = (q: string) => q.trim().replace(/^[“"'‘]+|[”"'’]+$/g, "").trim();

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("");

/** Story page: centred header, then the story told as numbered chapters along a centre line. */
export async function StoryDetail({ story, program }: { story: Story; program?: Program }) {
  const t = await getTranslations("site");
  const chapters = storyChapters(story.body);
  const opening = Boolean(story.quote || story.profile_image_url);
  const pad = (n: number) => String(n).padStart(2, "0");
  const node = (n: number) => (
    <span
      aria-hidden
      className="absolute left-5 top-0 z-10 flex size-10 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-primary ring-8 ring-white lg:left-1/2 lg:top-1/2 lg:size-12 lg:-translate-y-1/2"
    >
      {pad(n)}
    </span>
  );

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden bg-surface">
        <span aria-hidden className="absolute -left-24 top-10 size-72 rounded-full bg-primary/10 blur-3xl" />
        <span aria-hidden className="absolute -right-20 bottom-0 size-64 rounded-full bg-secondary/10 blur-3xl" />
        <Container narrow className="relative py-12 text-center sm:py-16">
          <p className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.24em] text-[#4d6b00]">
            <span aria-hidden className="h-px w-12 bg-[#4d6b00]/40" />
            {t("storiesEyebrow")}
            <span aria-hidden className="h-px w-12 bg-[#4d6b00]/40" />
          </p>
          <h1 className="display mt-4 text-balance text-4xl text-ink sm:text-5xl lg:text-6xl">{story.title}</h1>
          <span aria-hidden className="mx-auto mt-6 block h-1.5 w-24 rounded-full bg-primary" />
          {story.introduction && <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{story.introduction}</p>}
          <p className="mt-7 inline-flex items-center gap-3 rounded-full border border-border bg-white py-1.5 pl-1.5 pr-5 text-sm font-semibold text-ink shadow-sm">
            <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-primary">
              {story.profile_image_url ? <Image src={story.profile_image_url} alt="" fill sizes="36px" className="object-cover" /> : <span aria-hidden>{initials(story.person_name)}</span>}
            </span>
            {story.person_name}
          </p>
        </Container>
      </section>

      {/* The journey */}
      <section className="bg-white">
        <Container className="py-12 sm:py-16">
          <ol className="relative">
            <span aria-hidden className="absolute bottom-6 left-5 top-6 w-px bg-gradient-to-b from-primary via-secondary/30 to-primary lg:left-1/2" />

            {opening && (
              <li className="relative grid items-center gap-6 pb-14 pl-14 last:pb-0 lg:grid-cols-2 lg:gap-24 lg:pl-0">
                {node(1)}
                <div className="lg:text-right">
                  {story.quote ? (
                    <figure>
                      <Quote className="size-9 text-primary lg:ml-auto" aria-hidden />
                      <blockquote className="heading mt-4 text-pretty text-2xl leading-snug text-ink sm:text-3xl">“{bareQuote(story.quote)}”</blockquote>
                      <figcaption className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">— {story.person_name}</figcaption>
                    </figure>
                  ) : (
                    <p className="heading text-3xl text-ink">{story.person_name}</p>
                  )}
                </div>
                {story.profile_image_url && (
                  <figure className="relative">
                    <div className="relative aspect-[16/11] overflow-hidden rounded-[1.75rem] bg-muted shadow-[0_30px_60px_-30px_rgba(18,53,46,0.5)]">
                      <Image src={story.profile_image_url} alt={story.person_name} fill preload sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
                    </div>
                    <figcaption className="absolute -bottom-4 left-6 rounded-2xl bg-primary px-5 py-2.5 text-sm font-extrabold text-ink shadow-lg">{story.person_name}</figcaption>
                  </figure>
                )}
              </li>
            )}

            {chapters.map((c, i) => {
              const n = i + 1 + (opening ? 1 : 0);
              const right = n % 2 === 0;
              return (
                <li key={i} className="relative grid items-center gap-6 pb-14 pl-14 last:pb-0 lg:grid-cols-2 lg:gap-24 lg:pl-0">
                  {node(n)}
                  <div className={cn(right ? "lg:order-2" : "lg:order-1")}>
                    <article className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface/60 p-6 sm:p-8">
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        {t("chapter")} {pad(n)}
                      </p>
                      {c.title && <h2 className="heading mt-2 text-balance text-2xl text-ink sm:text-[1.75rem]">{c.title}</h2>}
                      {c.markdown && <RichText markdown={c.markdown} className="mt-3 break-words" />}
                    </article>
                  </div>
                  <div aria-hidden className={cn("hidden lg:block", right ? "lg:order-1 lg:text-right" : "lg:order-2")}>
                    <span className="display text-[7rem] leading-none text-ink/[0.06] xl:text-[9rem]">{pad(n)}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-3 border-t border-border pt-8 text-center">
            {program && (
              <p className="w-full text-sm text-muted-foreground">
                {t("partOf")} <Link href={`/programs/${program.slug}`} className="font-semibold text-secondary underline">{program.title}</Link>
              </p>
            )}
            <Link href="/stories" className={buttonVariants({ variant: "outline", className: "rounded-full" })}>
              {t("allStories")}
            </Link>
            <Link href="/contact" className={buttonVariants({ className: "rounded-full" })}>
              {t("shareYourStory")}
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
