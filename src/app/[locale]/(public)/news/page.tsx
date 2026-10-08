import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Newspaper } from "lucide-react";
import { getPosts } from "@/lib/data/public";
import { PostCard } from "@/components/layout/post-card";
import { EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("news");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function NewsPage() {
  const t = await getTranslations("news");
  const posts = await getPosts("news");
  return (
    <>
      <section className="bg-secondary py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-4xl font-extrabold">{t("title")}</h1>
          <p className="mt-2 text-white/80">{t("subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10">
        {posts.length === 0 ? (
          <EmptyState icon={Newspaper} title={t("noneTitle")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
