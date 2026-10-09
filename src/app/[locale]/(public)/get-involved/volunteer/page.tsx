import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { VolunteerForm } from "@/components/forms/involvement-forms";
import { FormPage } from "@/components/site/form-page";

export async function generateMetadata() {
  const t = await getTranslations("involve");
  return pageMetadata({ title: t("volunteerTitle"), description: t("volunteerIntro"), path: "/get-involved/volunteer" });
}

export default async function VolunteerPage() {
  const t = await getTranslations("involve");
  return (
    <FormPage
      current="volunteer"
      eyebrow={t("eyebrow")}
      title={t("volunteerTitle")}
      description={t("volunteerIntro")}
      back={{ href: "/get-involved", label: t("back") }}
      stepsTitle={t("nextSteps")}
      steps={[t("volunteerStep1"), t("volunteerStep2"), t("volunteerStep3")]}
    >
      <VolunteerForm />
    </FormPage>
  );
}
