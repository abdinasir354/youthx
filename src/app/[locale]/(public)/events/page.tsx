import { getTranslations } from "next-intl/server";
import { getPage, getPastEvents, getUpcomingEvents } from "@/lib/data/cms";
import { Sections } from "@/components/cms/sections";
import { Container, PageIntro } from "@/components/site/basics";
import { EventCard } from "@/components/site/cards";
import { cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("events", "Events");
}

export default async function EventsPage() {
  const [page, upcoming, past, t] = await Promise.all([getPage("events"), getUpcomingEvents(), getPastEvents(), getTranslations("site")]);
  return (
    <>
      <PageIntro eyebrow={t("eventsEyebrow")} title={page?.page.title ?? t("eventsTitle")} description={page?.page.description} />
      <Container className="py-10 sm:py-12">
        <section aria-labelledby="upcoming">
          <h2 id="upcoming" className="mb-6 text-2xl font-bold text-secondary">{t("upcomingEvents")}</h2>
          {upcoming.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-muted-foreground">{t("noUpcomingEvents")}</p>
          )}
        </section>
        {past.length > 0 && (
          <section aria-labelledby="past" className="mt-16">
            <h2 id="past" className="mb-6 text-2xl font-bold text-secondary">{t("pastEvents")}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {past.slice(0, 12).map((e) => <EventCard key={e.id} event={e} past />)}
            </div>
          </section>
        )}
      </Container>
      {page && <Sections sections={page.sections} />}
    </>
  );
}
