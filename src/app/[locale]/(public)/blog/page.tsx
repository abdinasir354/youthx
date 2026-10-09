import { getTranslations } from "next-intl/server";
import { Newspaper } from "lucide-react";
import { getPosts } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { Container, PageIntro } from "@/components/site/basics";
import { FeaturedPost, PostCard } from "@/components/site/blog";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return pageMetadata({ title: t("blogTitle"), description: t("blogIntro"), path: "/blog" });
}

/** Blog: news and updates written in Admin → Blog. */
export default async function BlogPage() {
  const [posts, t] = await Promise.all([getPosts("news", 60), getTranslations("site")]);
  const [first, ...rest] = posts;
  return (
    <>
      <PageIntro eyebrow={t("blogEyebrow")} title={t("blogTitle")} description={t("blogIntro")} />
      <section className="bg-white">
        <Container className="py-10 sm:py-14">
          {!first ? (
            <div className="rounded-[2rem] border border-dashed border-border bg-surface px-6 py-14 text-center">
              <Newspaper className="mx-auto size-10 text-secondary/40" aria-hidden />
              <p className="heading mt-4 text-2xl text-ink">{t("noPostsTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t("noPostsText")}</p>
            </div>
          ) : (
            <>
              <FeaturedPost post={first} />
              {rest.length > 0 && (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </Container>
      </section>
    </>
  );
}
