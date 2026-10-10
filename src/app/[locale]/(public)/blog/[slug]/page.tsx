import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPostBySlug, getPosts } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { Container, RichText, formatLongDate } from "@/components/site/basics";
import { PostCard, readingTime } from "@/components/site/blog";
import { PageSkeleton } from "@/components/ui/misc";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.kind !== "news") return {};
  return pageMetadata({ title: post.title, description: post.excerpt, image: post.cover_url, path: `/blog/${post.slug}`, type: "article" });
}

export default function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12"><PageSkeleton /></div>}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.kind !== "news") notFound();
  const [t, all] = await Promise.all([getTranslations("site"), getPosts("news", 4)]);
  const more = all.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <>
      <article className="bg-surface">
        <Container narrow className="enter-up pb-8 pt-8 sm:pt-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> {t("allPosts")}
          </Link>
          <p className="mt-6 text-sm font-semibold text-[#5f8500]">
            {formatLongDate(post.published_at ?? post.created_at)} · {t("minRead", { count: readingTime(post.body) })}
          </p>
          <h1 className="display mt-3 text-balance text-4xl text-ink sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-pretty text-xl leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        </Container>
        {post.cover_url && (
          <Container className="max-w-5xl">
            <div className="enter-up enter-up-2 relative aspect-[16/9] overflow-hidden rounded-[2rem]">
              <Image src={post.cover_url} alt="" fill preload sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
            </div>
          </Container>
        )}
        <Container narrow className="py-8 sm:py-10">
          <RichText markdown={post.body} className="break-words" />
        </Container>
      </article>
      {more.length > 0 && (
        <section className="bg-white">
          <Container className="py-10 sm:py-12">
            <h2 className="heading text-2xl text-ink sm:text-3xl">{t("morePosts")}</h2>
            <div data-reveal-stagger className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
