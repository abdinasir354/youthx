import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProgram } from "@/lib/data/cms";
import { pageMetadata } from "@/lib/seo";
import { PageSkeleton } from "@/components/ui/misc";
import { ProgramView } from "@/components/site/program-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/programs/[slug]">) {
  const { slug } = await params;
  const p = await getProgram(slug);
  if (!p) return {};
  return pageMetadata({ title: p.seo_title || p.title, description: p.seo_description || p.short_description, image: p.featured_image_url, path: `/programs/${p.slug}` });
}

export default function ProgramPage({ params }: PageProps<"/[locale]/programs/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16"><PageSkeleton /></div>}>
      <ProgramDetail params={params} />
    </Suspense>
  );
}

async function ProgramDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();
  return <ProgramView program={program} />;
}
