import { CmsPageView, cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("get-involved", "Get Involved");
}

/** Built from CMS sections (Admin → Pages → Get Involved). */
export default function GetInvolvedPage() {
  return <CmsPageView slug="get-involved" />;
}
