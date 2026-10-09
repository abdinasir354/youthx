import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { PartnerRequestForm } from "@/components/forms/public-forms";
import { FormPage } from "@/components/site/form-page";

export async function generateMetadata() {
  const t = await getTranslations("involve");
  return pageMetadata({ title: t("partnerTitle"), description: t("partnerIntro"), path: "/get-involved/partner" });
}

export default async function PartnerPage() {
  const t = await getTranslations("involve");
  return (
    <FormPage
      current="partner"
      eyebrow={t("eyebrow")}
      title={t("partnerTitle")}
      description={t("partnerIntro")}
      back={{ href: "/get-involved", label: t("back") }}
      stepsTitle={t("nextSteps")}
      steps={[t("partnerStep1"), t("partnerStep2"), t("partnerStep3")]}
    >
      <PartnerRequestForm kind="partner" />
    </FormPage>
  );
}
