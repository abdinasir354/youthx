import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CalendarDays, Clock, Globe2, MapPin, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPrograms, getSettings } from "@/lib/data/cms";
import { SITE_URL, jsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { CmsEvent } from "@/types/cms";
import { buttonVariants } from "@/components/ui/button";
import { Container, Eyebrow, RichText, SmartLink, formatEventDate } from "./basics";

/** Event page body (used by /events/[slug] and the admin preview). */
export async function EventView({ event }: { event: CmsEvent }) {
  const [t, programs, settings] = await Promise.all([getTranslations("site"), getPrograms(), getSettings()]);
  const program = programs.find((p) => p.id === event.program_id);
  const closed = event.event_status === "completed" || event.event_status === "cancelled";
  const date = formatEventDate(event.starts_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const start = formatEventDate(event.starts_at, { hour: "2-digit", minute: "2-digit" });
  const end = event.ends_at ? formatEventDate(event.ends_at, { hour: "2-digit", minute: "2-digit" }) : null;
  const dayKey = (iso: string) => formatEventDate(iso, { day: "numeric", month: "numeric", year: "numeric" });
  const sameDay = !event.ends_at || dayKey(event.ends_at) === dayKey(event.starts_at);

  // schema.org Event — helps search engines show the event.
  const ld = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    eventStatus: event.event_status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode:
      event.attendance_mode === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : event.attendance_mode === "hybrid"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    location:
      event.attendance_mode === "online"
        ? { "@type": "VirtualLocation", url: event.online_url ?? `${SITE_URL}/events/${event.slug}` }
        : { "@type": "Place", name: event.location ?? settings.site_name },
    image: event.featured_image_url ? [event.featured_image_url] : undefined,
    organizer: { "@type": "Organization", name: settings.site_name, url: SITE_URL },
    url: `${SITE_URL}/events/${event.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <section className="relative overflow-hidden bg-surface">
        <Container className="enter-up py-10 sm:py-12">
          <Eyebrow>{t(`eventTypes.${event.event_type}`)}</Eyebrow>
          <h1 className="mt-2 max-w-4xl display text-balance text-5xl text-ink sm:text-6xl">{event.title}</h1>
          {event.summary && <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">{event.summary}</p>}
          <p className={cn("mt-6 inline-flex rounded px-3 py-1 text-sm font-semibold", event.event_status === "cancelled" ? "bg-danger text-white" : "bg-primary text-secondary")}>
            {t(`eventStatus.${event.event_status}`)}
          </p>
        </Container>
      </section>

      <Container className="grid gap-12 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {event.featured_image_url && (
            <div className="relative mb-10 aspect-video overflow-hidden rounded-lg bg-muted">
              <Image src={event.featured_image_url} alt="" fill preload sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
            </div>
          )}
          <RichText markdown={event.description} />
          {event.speakers && event.speakers.length > 0 && (
            <section className="mt-12" aria-labelledby="speakers">
              <h2 id="speakers" className="text-2xl font-bold text-secondary">{t("speakers")}</h2>
              <ul data-reveal-stagger className="mt-6 grid gap-5 sm:grid-cols-2">
                {event.speakers.map((s) => (
                  <li key={s.name} className="flex gap-4 rounded-lg border border-border p-5">
                    {s.image_url && (
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image src={s.image_url} alt="" fill sizes="64px" className="object-cover" />
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-secondary">{s.name}</p>
                      {s.role_title && <p className="text-sm text-muted-foreground">{s.role_title}</p>}
                      {s.bio && <p className="mt-2 text-sm leading-relaxed text-foreground/85">{s.bio}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-6 rounded-lg border border-border bg-muted/50 p-6 lg:sticky lg:top-24" aria-label={t("eventDetails")}>
          <dl className="space-y-4 text-sm">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
              <div>
                <dt className="sr-only">{t("date")}</dt>
                <dd className="font-semibold text-secondary"><time dateTime={event.starts_at}>{date}</time></dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
              <div>
                <dt className="sr-only">{t("time")}</dt>
                <dd className="text-secondary">
                  {start}
                  {end && sameDay ? `–${end}` : ""} EAT
                  {end && !sameDay && (
                    <span className="block text-muted-foreground">
                      {t("until")} {formatEventDate(event.ends_at!, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              {event.attendance_mode === "online" ? <Globe2 className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden /> : <MapPin className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />}
              <div>
                <dt className="sr-only">{t("location")}</dt>
                <dd className="text-secondary">
                  {t(`attendance.${event.attendance_mode}`)}
                  {event.location && <span className="block text-muted-foreground">{event.location}</span>}
                </dd>
              </div>
            </div>
            {event.capacity && (
              <div className="flex gap-3">
                <Users className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
                <div>
                  <dt className="sr-only">{t("capacity")}</dt>
                  <dd className="text-secondary">{t("seats", { count: event.capacity })}</dd>
                </div>
              </div>
            )}
          </dl>
          {!closed && event.registration_url && (
            <SmartLink href={event.registration_url} className={buttonVariants({ size: "lg", className: "w-full" })}>
              {t("register")}
            </SmartLink>
          )}
          {!closed && event.online_url && event.attendance_mode !== "in_person" && (
            <SmartLink href={event.online_url} className={buttonVariants({ variant: "outline", className: "w-full" })}>
              {t("joinOnline")}
            </SmartLink>
          )}
          {program && (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              {t("partOf")}{" "}
              <Link href={`/programs/${program.slug}`} className="font-semibold text-secondary underline">
                {program.title}
              </Link>
            </p>
          )}
        </aside>
      </Container>
    </>
  );
}
