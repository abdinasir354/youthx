import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPrograms, getProject } from "@/lib/data/cms";
import { pageMetadata } from "@/lib/seo";
import { PageSkeleton } from "@/components/ui/misc";
import { ProjectDetail } from "@/components/site/detail-pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects/[slug]">) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return pageMetadata({ title: project.seo_title || project.title, description: project.seo_description || project.summary, image: project.featured_image_url, path: `/projects/${project.slug}`, type: "article" });
}

export default function ProjectPage({ params }: PageProps<"/[locale]/projects/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16"><PageSkeleton /></div>}>
      <ProjectLoader params={params} />
    </Suspense>
  );
}

async function ProjectLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  const program = (await getPrograms()).find((p) => p.id === project.program_id);
  return <ProjectDetail project={project} program={program} />;
}
