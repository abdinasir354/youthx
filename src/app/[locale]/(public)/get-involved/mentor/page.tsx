import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { MentorApplicationForm } from "@/components/forms/involvement-forms";
import { FormPage } from "@/components/site/form-page";

export async function generateMetadata() {
  const t = await getTranslations("involve");
  return pageMetadata({ title: t("mentorTitle"), description: t("mentorIntro"), path: "/get-involved/mentor" });
}

export default async function MentorPage() {
  const t = await getTranslations("involve");
  return (
    <FormPage
      current="mentor"
      eyebrow={t("eyebrow")}
      title={t("mentorTitle")}
      description={t("mentorIntro")}
      back={{ href: "/get-involved", label: t("back") }}
      stepsTitle={t("nextSteps")}
      steps={[t("mentorStep1"), t("mentorStep2"), t("mentorStep3")]}
    >
      <MentorApplicationForm />
    </FormPage>
  );
}
