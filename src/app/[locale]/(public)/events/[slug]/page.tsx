import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/data/cms";
import { pageMetadata } from "@/lib/seo";
import { PageSkeleton } from "@/components/ui/misc";
import { EventView } from "@/components/site/event-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/events/[slug]">) {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return {};
  return pageMetadata({ title: e.seo_title || e.title, description: e.seo_description || e.summary, image: e.featured_image_url, path: `/events/${e.slug}` });
}

export default function EventPage({ params }: PageProps<"/[locale]/events/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><PageSkeleton /></div>}>
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  return <EventView event={event} />;
}
