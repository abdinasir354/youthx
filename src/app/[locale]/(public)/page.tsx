import { getPage, getSettings } from "@/lib/data/cms";
import { Sections } from "@/components/cms/sections";
import { cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("home", "Youthup Foundation");
}

/** Home is built entirely from CMS sections (Admin → Pages → Home). */
export default async function HomePage() {
  const data = await getPage("home");
  if (data?.sections.length) return <Sections sections={data.sections} />;

  // Database not set up yet (or the page was unpublished): a minimal, real-content hero.
  const s = await getSettings();
  return (
    <Sections
      sections={[
        {
          id: "fallback-hero",
          type: "hero",
          anchor: null,
          data: {
            eyebrow: s.site_name,
            heading: s.tagline ?? s.site_name,
            subheading: s.description,
            primary_cta: { label: "Explore Our Programs", href: "/programs" },
            secondary_cta: { label: "Join Youthup", href: "/get-involved" },
          },
        },
      ]}
    />
  );
}
