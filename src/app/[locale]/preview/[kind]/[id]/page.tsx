import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CmsEvent, CmsPage, CmsSection, Partner, Program, Project, Resource, Story } from "@/types/cms";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CmsPageBody } from "@/components/site/cms-page";
import { ProjectDetail, ResourceDetail, StoryDetail } from "@/components/site/detail-pages";
import { EventView } from "@/components/site/event-view";
import { ProgramView } from "@/components/site/program-view";
import { PageSkeleton } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Admin-only preview of drafts, rendered exactly like the public page. Others get a 404. */
export default function PreviewPage({ params }: PageProps<"/[locale]/preview/[kind]/[id]">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><PageSkeleton /></div>}>
          <Preview params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Preview({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!UUID.test(id)) notFound();
  await requireAdmin();
  const supabase = await createClient(); // admin session → RLS shows drafts

  let content: React.ReactNode = null;
  let status = "";
  switch (kind) {
    case "page": {
      const { data: page } = await supabase.from("pages").select("*").eq("id", id).maybeSingle();
      if (!page) notFound();
      const { data: sections } = await supabase.from("page_sections").select("id, type, anchor, data").eq("page_id", id).eq("is_visible", true).order("position");
      status = page.status;
      content = <CmsPageBody page={page as CmsPage} sections={(sections ?? []) as CmsSection[]} />;
      break;
    }
    case "programs": {
      const { data } = await supabase.from("programs").select("*, category:program_categories(name, slug)").eq("id", id).maybeSingle();
      if (!data) notFound();
      status = data.status;
      content = <ProgramView program={data as Program} />;
      break;
    }
    case "events": {
      const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (!data) notFound();
      const { data: speakers } = await supabase.from("event_speakers").select("name, role_title, bio, image_url").eq("event_id", id).order("position");
      status = data.status;
      content = <EventView event={{ ...(data as CmsEvent), speakers: speakers ?? [] }} />;
      break;
    }
    case "projects": {
      const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (!data) notFound();
      const { data: links } = await supabase.from("project_partners").select("partner:partners(id, name, logo_url, website, description)").eq("project_id", id);
      const partners = ((links ?? []) as unknown as { partner: Partner | null }[]).map((l) => l.partner).filter(Boolean) as Partner[];
      status = data.status;
      content = <ProjectDetail project={{ ...(data as Project), partners }} />;
      break;
    }
    case "resources": {
      const { data } = await supabase.from("resources").select("*, category:resource_categories(name, slug)").eq("id", id).maybeSingle();
      if (!data) notFound();
      status = data.status;
      content = <ResourceDetail resource={data as Resource} />;
      break;
    }
    case "stories": {
      const { data } = await supabase.from("stories").select("*").eq("id", id).maybeSingle();
      if (!data) notFound();
      status = data.status;
      content = <StoryDetail story={data as Story} />;
      break;
    }
    default:
      notFound();
  }

  return (
    <>
      <div role="status" className="sticky top-16 z-30 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-semibold text-white lg:top-[72px]">
        <Eye className="size-4" aria-hidden /> Preview — {status === "published" ? "this is how the live page looks" : `this ${status} content is not public yet`}
      </div>
      {content}
    </>
  );
}
