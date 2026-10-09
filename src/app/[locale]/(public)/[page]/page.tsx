import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CmsPageView, cmsPageMetadata } from "@/components/site/cms-page";
import { PageSkeleton } from "@/components/ui/misc";

/** Built-in slugs have their own routes; program-* pages only add sections to program pages. */
const RESERVED = new Set(["home", "about", "programs", "opportunities", "events", "get-involved", "contact", "privacy", "terms", "cookies", "gallery", "blog"]);

export async function generateMetadata({ params }: PageProps<"/[locale]/[page]">) {
  const { page } = await params;
  return cmsPageMetadata(page, page);
}

/** Custom pages created in Admin → Pages (e.g. /annual-report). */
export default function CustomCmsPage({ params }: PageProps<"/[locale]/[page]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12"><PageSkeleton /></div>}>
      <CustomPage params={params} />
    </Suspense>
  );
}

async function CustomPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (RESERVED.has(page) || page.startsWith("program-") || !/^[a-z0-9-]+$/.test(page)) notFound();
  return <CmsPageView slug={page} />;
}
