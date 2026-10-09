import { CmsPageView, cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("terms", "Terms of Use");
}

export default function TermsPage() {
  return <CmsPageView slug="terms" />;
}
