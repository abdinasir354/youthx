import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPage } from "@/lib/data/cms";
import { pagePublicPath } from "@/lib/cms/pages";
import { pageMetadata } from "@/lib/seo";
import type { CmsPage, CmsSection } from "@/types/cms";
import { Sections } from "@/components/cms/sections";
import { PageIntro } from "./basics";

/** Metadata for a CMS page, from its SEO fields. */
export async function cmsPageMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const data = await getPage(slug);
  const p = data?.page;
  return pageMetadata({
    title: p?.seo_title || p?.title || fallbackTitle,
    description: p?.seo_description || p?.description,
    image: p?.og_image_url,
    path: pagePublicPath(slug),
    absoluteTitle: slug === "home",
  });
}

/** A whole page built from CMS sections (with an intro header unless it starts with a hero). */
export function CmsPageBody({ page, sections, showIntro = true }: { page: CmsPage; sections: CmsSection[]; showIntro?: boolean }) {
  const startsWithHero = sections[0]?.type === "hero";
  return (
    <>
      {showIntro && !startsWithHero && <PageIntro title={page.title} description={page.description} />}
      <Sections sections={sections} />
    </>
  );
}

export async function CmsPageView({ slug }: { slug: string }) {
  const data = await getPage(slug);
  if (!data) notFound();
  return <CmsPageBody page={data.page} sections={data.sections} />;
}
