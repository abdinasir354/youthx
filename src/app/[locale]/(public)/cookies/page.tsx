import { CmsPageView, cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("cookies", "Cookie Policy");
}

export default function CookiePolicyPage() {
  return <CmsPageView slug="cookies" />;
}
