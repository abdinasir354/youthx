import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { PostForm } from "@/components/admin/content-forms";
import { PageHeader } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("newPost"), robots: { index: false } };
}

export default async function NewPostPage() {
  await requireAdmin("content");
  const t = await getTranslations("admin");
  return (
    <div className="max-w-4xl">
      <PageHeader title={t("newPost")} />
      <PostForm />
    </div>
  );
}
