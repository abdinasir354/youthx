import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowRight, Briefcase, CalendarDays, Clock, Code2, FileText, Flag, Globe2, GraduationCap, HeartHandshake, Lightbulb,
  MapPin, PlayCircle, Quote, Sparkles, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { CmsEvent, Program, Project, Resource, Story } from "@/types/cms";
import { formatEventDate } from "./basics";

const card =
  "group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(18,53,46,0.35)] focus-within:ring-2 focus-within:ring-primary";

const TONES = [
  "bg-[#ecf7c6] text-[#4d6b00]",
  "bg-[#d8efe9] text-[#1c4b40]",
  "bg-[#fdebc8] text-[#8a5a00]",
  "bg-[#e3ecfb] text-[#264f8c]",
  "bg-[#f8e1e7] text-[#8c2f4b]",
  "bg-[#ece6fa] text-[#4d3a8c]",
];

/** A fitting icon per program (by slug, then by category). */
const PROGRAM_ICONS: Record<string, LucideIcon> = {
  "education-academic-support": GraduationCap,
  "digital-skills-technology": Code2,
  "workshops-training": Wrench,
  mentorship: HeartHandshake,
  "leadership-development": Flag,
  "career-development": Briefcase,
  "entrepreneurship-innovation": Lightbulb,
  "community-development": Users,
};
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  education: GraduationCap,
  skills: Code2,
  "mentorship-leadership": HeartHandshake,
  "careers-enterprise": Briefcase,
  community: Users,
};

export function ProgramCard({ program, index = 0 }: { program: Program; index?: number }) {
  const t = useTranslations("site");
  const Icon = PROGRAM_ICONS[program.slug] ?? CATEGORY_ICONS[program.category?.slug ?? ""] ?? Sparkles;
  return (
    <article className={cn(card, "p-8")}>
      {program.featured_image_url ? (
        <div className="relative -mx-8 -mt-8 mb-7 aspect-[16/10] overflow-hidden">
          <Image src={program.featured_image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
      ) : (
        <span className={cn("flex size-16 items-center justify-center rounded-2xl", TONES[index % TONES.length])}>
          <Icon className="size-7" aria-hidden />
        </span>
      )}
      {program.category && <p className={cn("text-[0.8125rem] font-bold uppercase tracking-[0.2em] text-[#5f8500]", !program.featured_image_url && "mt-8")}>{program.category.name}</p>}
      <h3 className="heading mt-2 text-[1.6rem] text-ink">
        <Link href={`/programs/${program.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {program.title}
        </Link>
      </h3>
      {program.short_description && <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted-foreground">{program.short_description}</p>}
      <p className="mt-auto flex items-center gap-2 pt-7 text-base font-semibold text-ink">
        {t("learnMore")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
      </p>
    </article>
  );
}

export function EventCard({ event, past }: { event: CmsEvent; past?: boolean }) {
  const t = useTranslations("site");
  const day = formatEventDate(event.starts_at, { day: "2-digit" });
  const month = formatEventDate(event.starts_at, { month: "short" });
  const time = formatEventDate(event.starts_at, { hour: "2-digit", minute: "2-digit" });
  return (
    <article className={cn(card, past && "opacity-90")}>
      {event.featured_image_url && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image src={event.featured_image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
      )}
      <div className="flex gap-5 p-7">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink py-3 text-white" aria-hidden>
          <span className="heading text-3xl leading-none">{day}</span>
          <span className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">{month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-bold uppercase tracking-[0.18em] text-[#5f8500]">{t(`eventTypes.${event.event_type}`)}</p>
          <h3 className="heading mt-1.5 text-xl text-ink">
            <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {event.title}
            </Link>
          </h3>
          <ul className="mt-3 space-y-1.5 text-[0.9375rem] text-muted-foreground">
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <time dateTime={event.starts_at}>{formatEventDate(event.starts_at, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</time>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-4 shrink-0" aria-hidden /> {time} EAT
            </li>
            <li className="flex items-center gap-2">
              {event.attendance_mode === "online" ? <Globe2 className="size-4 shrink-0" aria-hidden /> : <MapPin className="size-4 shrink-0" aria-hidden />}
              {event.attendance_mode === "online" ? t("online") : event.location || t(`attendance.${event.attendance_mode}`)}
            </li>
          </ul>
        </div>
      </div>
      {(event.event_status === "registration_open" || event.event_status === "cancelled") && (
        <p className={cn("mt-auto border-t border-border px-7 py-3 text-sm font-bold", event.event_status === "cancelled" ? "text-danger" : "text-[#4d6b00]")}>
          {t(`eventStatus.${event.event_status}`)}
        </p>
      )}
    </article>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const t = useTranslations("site");
  return (
    <article className={card}>
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {project.featured_image_url ? (
          <Image src={project.featured_image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="bg-lattice absolute inset-0" aria-hidden />
        )}
      </div>
      <div className="flex flex-1 flex-col p-7">
        <p className="text-[0.8125rem] font-bold uppercase tracking-[0.18em] text-[#5f8500]">{t(`projectStatus.${project.project_status}`)}</p>
        <h3 className="heading mt-2 text-xl text-ink">
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {project.title}
          </Link>
        </h3>
        {project.summary && <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted-foreground">{project.summary}</p>}
        {project.location && (
          <p className="mt-auto flex items-center gap-2 pt-5 text-[0.9375rem] text-muted-foreground">
            <MapPin className="size-4" aria-hidden /> {project.location}
          </p>
        )}
      </div>
    </article>
  );
}

export function ResourceCard({ resource }: { resource: Resource }) {
  const t = useTranslations("site");
  const Icon = resource.resource_type === "video" ? PlayCircle : FileText;
  return (
    <article className={cn(card, "p-7")}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#d8efe9] text-secondary">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-6 text-[0.8125rem] font-bold uppercase tracking-[0.18em] text-[#5f8500]">{t(`resourceTypes.${resource.resource_type}`)}</p>
      <h3 className="heading mt-2 text-xl text-ink">
        <Link href={`/resources/${resource.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {resource.title}
        </Link>
      </h3>
      {resource.description && <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted-foreground">{resource.description}</p>}
      {resource.author && <p className="mt-auto pt-5 text-sm text-muted-foreground">{resource.author}</p>}
    </article>
  );
}

/** Testimonial-style card. Only real stories, published with the person's consent, reach this. */
export function StoryCard({ story }: { story: Story }) {
  return (
    <article className={cn(card, "p-8")}>
      <Quote className="size-9 text-primary" aria-hidden />
      <blockquote className="mt-5 line-clamp-6 text-pretty text-lg leading-relaxed text-ink/85">“{story.quote || story.introduction}”</blockquote>
      <div className="mt-auto flex items-center gap-4 border-t border-border pt-6">
        <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-lg font-bold text-primary">
          {story.profile_image_url ? (
            <Image src={story.profile_image_url} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <span aria-hidden>{story.person_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-ink">{story.person_name}</p>
          <h3 className="truncate text-sm text-muted-foreground">
            <Link href={`/stories/${story.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {story.title}
            </Link>
          </h3>
        </div>
      </div>
    </article>
  );
}
