import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { CourseForm } from "@/components/admin/content-forms";
import { PageHeader } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("newCourse"), robots: { index: false } };
}

export default async function NewCoursePage() {
  await requireAdmin("content");
  const t = await getTranslations("admin");
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("newCourse")} />
      <CourseForm />
    </div>
  );
}
