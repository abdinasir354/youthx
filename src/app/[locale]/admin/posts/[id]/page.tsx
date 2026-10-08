import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/admin/content-forms";
import { PageHeader } from "@/components/ui/misc";
import type { Post } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("posts"), robots: { index: false } };
}

export default async function EditPostPage({ params }: PageProps<"/[locale]/admin/posts/[id]">) {
  await requireAdmin("content");
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={(data as Post).title} />
      <PostForm post={data as Post} />
    </div>
  );
}
