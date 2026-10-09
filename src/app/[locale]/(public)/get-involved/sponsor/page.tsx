import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { PartnerRequestForm } from "@/components/forms/public-forms";
import { FormPage } from "@/components/site/form-page";

export async function generateMetadata() {
  const t = await getTranslations("involve");
  return pageMetadata({ title: t("sponsorTitle"), description: t("sponsorIntro"), path: "/get-involved/sponsor" });
}

export default async function SponsorPage() {
  const t = await getTranslations("involve");
  return (
    <FormPage
      current="sponsor"
      eyebrow={t("eyebrow")}
      title={t("sponsorTitle")}
      description={t("sponsorIntro")}
      back={{ href: "/get-involved", label: t("back") }}
      stepsTitle={t("nextSteps")}
      steps={[t("sponsorStep1"), t("sponsorStep2"), t("sponsorStep3")]}
    >
      <PartnerRequestForm kind="sponsor" />
    </FormPage>
  );
}
