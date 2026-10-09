import { CmsPageView, cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("about", "About");
}

export default function AboutPage() {
  return <CmsPageView slug="about" />;
}
