import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CalendarDays, CheckCircle2, Download, ExternalLink, FileText, MapPin, Quote } from "lucide-react";
import { Link } from "@/i18n/navigation";
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

export async function StoryDetail({ story, program }: { story: Story; program?: Program }) {
  const t = await getTranslations("site");
  return (
    <>
      <section className="relative overflow-hidden bg-surface">
        <Container narrow className="py-14 text-center sm:py-20">
          {story.profile_image_url && (
            <span className="relative mx-auto mb-6 block size-28 overflow-hidden rounded-full border-4 border-primary">
              <Image src={story.profile_image_url} alt={story.person_name} fill preload sizes="112px" className="object-cover" />
            </span>
          )}
          <Eyebrow>{t("storiesEyebrow")}</Eyebrow>
          <h1 className="mt-2 display text-balance text-5xl text-ink sm:text-6xl">{story.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{story.person_name}</p>
        </Container>
      </section>
      <Container narrow className="py-10 sm:py-12">
        {story.quote && (
          <figure className="mb-10 border-l-4 border-primary pl-6">
            <Quote className="size-7 text-secondary/40" aria-hidden />
            <blockquote className="mt-2 text-pretty text-2xl font-medium leading-snug text-secondary">{story.quote}</blockquote>
            <figcaption className="mt-3 text-sm text-muted-foreground">— {story.person_name}</figcaption>
          </figure>
        )}
        {story.introduction && <p className="mb-6 text-lg leading-relaxed text-foreground/90">{story.introduction}</p>}
        <RichText markdown={story.body} />
        {program && (
          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            {t("partOf")} <Link href={`/programs/${program.slug}`} className="font-semibold text-secondary underline">{program.title}</Link>
          </p>
        )}
      </Container>
    </>
  );
}
