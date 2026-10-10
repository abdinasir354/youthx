import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowRight, Briefcase, CalendarDays, Clock, Code2, FileText, Flag, Globe2, GraduationCap, HeartHandshake, Lightbulb,
  MapPin, PlayCircle, Quote, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { CmsEvent, Program, Project, Resource, Story } from "@/types/cms";
import { formatEventDate } from "./basics";
import { PhotoPlaceholder } from "./shapes";

const card =
  "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white transition-[translate,border-color] duration-[350ms] ease-soft hover:-translate-y-1.5 hover:border-secondary/30 focus-within:ring-2 focus-within:ring-primary";

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
  const Icon = PROGRAM_ICONS[program.slug] ?? CATEGORY_ICONS[program.category?.slug ?? ""] ?? Users;
  return (
    <article className={cn(card, "p-6")}>
      {program.featured_image_url ? (
        <div className="relative -mx-6 -mt-6 mb-5 aspect-[16/10] overflow-hidden">
          <Image src={program.featured_image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" />
        </div>
      ) : (
        <span className={cn("flex size-10 items-center justify-center rounded-lg", TONES[index % TONES.length])}>
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      {program.category && <p className={cn("text-xs font-semibold uppercase tracking-wider text-[#5f8500]", !program.featured_image_url && "mt-4")}>{program.category.name}</p>}
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">
        <Link href={`/programs/${program.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {program.title}
        </Link>
      </h3>
      {program.short_description && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{program.short_description}</p>}
      <p className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-secondary">
        {t("learnMore")} <ArrowRight className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1" aria-hidden />
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
          <Image src={event.featured_image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" />
        </div>
      )}
      <div className="flex gap-4 p-5">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-lg border border-border bg-surface py-2 text-ink" aria-hidden>
          <span className="text-2xl font-bold leading-none">{day}</span>
          <span className="mt-1 text-xs font-medium uppercase text-muted-foreground">{month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5f8500]">{t(`eventTypes.${event.event_type}`)}</p>
          <h3 className="mt-1.5 text-lg font-semibold leading-snug text-ink">
            <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {event.title}
            </Link>
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
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
        <p className={cn("mt-auto border-t border-border px-5 py-3 text-sm font-medium", event.event_status === "cancelled" ? "text-danger" : "text-[#4d6b00]")}>
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
          <Image src={project.featured_image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" />
        ) : (
          <PhotoPlaceholder className="absolute inset-0" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5f8500]">{t(`projectStatus.${project.project_status}`)}</p>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {project.title}
          </Link>
        </h3>
        {project.summary && <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted-foreground">{project.summary}</p>}
        {project.location && (
          <p className="mt-auto flex items-center gap-2 pt-4 text-sm text-muted-foreground">
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
    <article className={cn(card, "p-6")}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-secondary-soft text-secondary">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#5f8500]">{t(`resourceTypes.${resource.resource_type}`)}</p>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">
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
    <article className={cn(card, "p-6")}>
      <Quote className="size-6 text-[#5f8500]" aria-hidden />
      <blockquote className="mt-3 line-clamp-6 text-pretty text-base leading-relaxed text-ink/85">“{(story.quote || story.introduction || "").trim().replace(/^[“"'‘]+|[”"'’]+$/g, "").trim()}”</blockquote>
      <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
        <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-primary">
          {story.profile_image_url ? (
            <Image src={story.profile_image_url} alt="" fill sizes="44px" className="object-cover" />
          ) : (
            <span aria-hidden>{story.person_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{story.person_name}</p>
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
