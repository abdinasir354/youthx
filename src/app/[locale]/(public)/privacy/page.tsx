import { CmsPageView, cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("privacy", "Privacy Policy");
}

export default function PrivacyPage() {
  return <CmsPageView slug="privacy" />;
}
