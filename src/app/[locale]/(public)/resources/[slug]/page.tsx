import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getResource } from "@/lib/data/cms";
import { pageMetadata } from "@/lib/seo";
import { PageSkeleton } from "@/components/ui/misc";
import { ResourceDetail } from "@/components/site/detail-pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/resources/[slug]">) {
  const { slug } = await params;
  const resource = await getResource(slug);
  if (!resource) return {};
  return pageMetadata({ title: resource.seo_title || resource.title, description: resource.seo_description || resource.description, image: resource.cover_image_url, path: `/resources/${resource.slug}`, type: "article" });
}

export default function ResourcePage({ params }: PageProps<"/[locale]/resources/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16"><PageSkeleton /></div>}>
      <ResourceLoader params={params} />
    </Suspense>
  );
}

async function ResourceLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = await getResource(slug);
  if (!resource) notFound();

  return <ResourceDetail resource={resource} />;
}
