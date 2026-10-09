import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStory } from "@/lib/data/cms";
import { pageMetadata } from "@/lib/seo";
import { PageSkeleton } from "@/components/ui/misc";
import { StoryDetail } from "@/components/site/detail-pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/stories/[slug]">) {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) return {};
  return pageMetadata({ title: story.seo_title || story.title, description: story.seo_description || story.introduction, image: story.profile_image_url, path: `/stories/${story.slug}`, type: "article" });
}

export default function StoryPage({ params }: PageProps<"/[locale]/stories/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16"><PageSkeleton /></div>}>
      <StoryLoader params={params} />
    </Suspense>
  );
}

async function StoryLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) notFound();
  return <StoryDetail story={story} />;
}
