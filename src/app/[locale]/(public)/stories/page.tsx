import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Quote } from "lucide-react";
import { getPosts } from "@/lib/data/public";
import { StoryCard } from "@/components/layout/post-card";
import { EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("stories");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function StoriesPage() {
  const t = await getTranslations("stories");
  const stories = await getPosts("story");
  return (
    <>
      <section className="bg-secondary py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-4xl font-extrabold">{t("title")}</h1>
          <p className="mt-2 text-white/80">{t("subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10">
        {stories.length === 0 ? (
          <EmptyState icon={Quote} title={t("noneTitle")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <StoryCard key={s.id} post={s} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
