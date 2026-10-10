import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Check, Clock, MapPin, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPage, getProjects, getResources, getStories, getUpcomingEvents } from "@/lib/data/cms";
import type { Program } from "@/types/cms";
import { Sections } from "@/components/cms/sections";
import { Container, RichText, SectionHeading, SmartLink, pill } from "./basics";
import { EventCard, ProjectCard, ResourceCard, StoryCard } from "./cards";

/**
 * Program page (used by /programs/[slug] and the admin preview). Kept deliberately simple:
 * header → key facts → description → objectives → related content → one clear call to action.
 */
export async function ProgramView({ program }: { program: Program }) {
  const [t, extra, events, projects, resources, stories] = await Promise.all([
    getTranslations("site"),
    getPage(`program-${program.slug}`),
    getUpcomingEvents(),
    getProjects(),
    getResources(),
    getStories(),
  ]);
  const related = {
    events: events.filter((e) => e.program_id === program.id).slice(0, 3),
    projects: projects.filter((p) => p.program_id === program.id).slice(0, 3),
    resources: resources.filter((r) => r.program_id === program.id).slice(0, 3),
    stories: stories.filter((s) => s.program_id === program.id).slice(0, 3),
  };
  const facts = [
    program.target_audience && { icon: Users, label: t("audience"), value: program.target_audience },
    program.duration && { icon: Clock, label: t("duration"), value: program.duration },
    program.location && { icon: MapPin, label: t("location"), value: program.location },
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[];
  const actions = (program.application_url || program.registration_url) && (
    <div className="flex flex-wrap gap-3">
      {program.application_url && (
        <SmartLink href={program.application_url} className={pill.dark}>
          {t("applyNow")} <span aria-hidden>→</span>
        </SmartLink>
      )}
      {program.registration_url && (
        <SmartLink href={program.registration_url} className={program.application_url ? pill.outline : pill.dark}>
          {t("register")}
        </SmartLink>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Header */}
      <section className="relative overflow-hidden bg-surface">
        <Container narrow className="enter-up relative pb-8 pt-8 sm:pb-10 sm:pt-10">
          <Link href="/programs" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors duration-300 hover:text-ink [&>svg]:transition-transform [&>svg]:duration-300 hover:[&>svg]:-translate-x-1">
            <ArrowLeft className="size-4" aria-hidden /> {t("allPrograms")}
          </Link>
          {program.category && (
            <p className="mt-8 inline-flex rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#4d6b00]">{program.category.name}</p>
          )}
          <h1 className="display mt-3 text-balance text-3xl text-ink sm:text-4xl lg:text-[2.75rem]">{program.title}</h1>
          {program.short_description && <p className="mt-6 text-pretty text-xl leading-relaxed text-muted-foreground">{program.short_description}</p>}
          {actions && <div className="mt-9">{actions}</div>}
        </Container>
      </section>

      <div className="bg-white">
        <Container narrow className="py-8 sm:py-10">
          {/* 2. Key facts */}
          {facts.length > 0 && (
            <dl data-reveal-stagger className="grid gap-3 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className="rounded-xl bg-surface p-4">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <f.icon className="size-4 text-secondary" aria-hidden /> {f.label}
                  </dt>
                  <dd className="mt-2 text-lg font-semibold leading-snug text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {program.featured_image_url && (
            <div data-reveal="image" className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl">
              <Image src={program.featured_image_url} alt="" fill preload sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
            </div>
          )}

          {/* 3. About */}
          {program.description && (
            <section aria-labelledby="about-program" className="mt-10">
              <h2 id="about-program" data-reveal className="heading text-3xl text-ink">{t("aboutProgram")}</h2>
              <RichText markdown={program.description} className="mt-5 break-words" />
            </section>
          )}

          {/* 4. Objectives */}
          {program.objectives.length > 0 && (
            <section aria-labelledby="objectives" className="mt-10">
              <h2 id="objectives" data-reveal className="heading text-3xl text-ink">{t("whatYouGain")}</h2>
              <ul data-reveal-stagger className="mt-6 space-y-3">
                {program.objectives.map((o) => (
                  <li key={o} className="flex gap-3 rounded-xl border border-border p-4 text-base">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-ink" aria-hidden>
                      <Check className="size-4" />
                    </span>
                    <span className="text-ink/90">{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {program.gallery.length > 0 && (
            <ul data-reveal-stagger className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={t("gallery")}>
              {program.gallery.map((src, i) => (
                <li key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image src={src} alt={`${program.title} — ${i + 1}`} fill sizes="(min-width: 768px) 250px, 50vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" loading="lazy" />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </div>

      {extra && <Sections sections={extra.sections} />}

      {/* 5. Related content */}
      {related.events.length > 0 && <RelatedBlock heading={t("upcomingSessions")}>{related.events.map((e) => <EventCard key={e.id} event={e} />)}</RelatedBlock>}
      {related.projects.length > 0 && <RelatedBlock heading={t("relatedProjects")}>{related.projects.map((p) => <ProjectCard key={p.id} project={p} />)}</RelatedBlock>}
      {related.resources.length > 0 && <RelatedBlock heading={t("relatedResources")}>{related.resources.map((r) => <ResourceCard key={r.id} resource={r} />)}</RelatedBlock>}
      {related.stories.length > 0 && <RelatedBlock heading={t("relatedStories")}>{related.stories.map((s) => <StoryCard key={s.id} story={s} />)}</RelatedBlock>}

      {/* 6. One clear call to action */}
      <section className="bg-surface py-8 sm:py-8">
        <Container>
          <div data-reveal className="rounded-2xl bg-ink px-6 py-8 text-center text-white sm:px-10 sm:py-10">
            <h2 className="heading text-balance text-2xl sm:text-3xl">{t("interested")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-white/75">{t("interestedText")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {program.application_url ? (
                <SmartLink href={program.application_url} className={pill.primary}>
                  {t("applyNow")} <span aria-hidden>→</span>
                </SmartLink>
              ) : program.registration_url ? (
                <SmartLink href={program.registration_url} className={pill.primary}>
                  {t("register")} <span aria-hidden>→</span>
                </SmartLink>
              ) : null}
              <SmartLink href="/contact" className={pill.ghostLight}>
                {t("askQuestion")}
              </SmartLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function RelatedBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface py-8 sm:py-10">
      <Container>
        <SectionHeading heading={heading} />
        <div data-reveal-stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </Container>
    </section>
  );
}
