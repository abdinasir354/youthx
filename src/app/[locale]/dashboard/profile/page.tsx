import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { ProfileWizard } from "@/components/forms/profile-wizard";
import { PageHeader } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title"), robots: { index: false } };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations("profile");
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ProfileWizard profile={user.profile} />
    </div>
  );
}
