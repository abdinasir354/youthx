import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPostBySlug } from "@/lib/data/public";
import { sanitize } from "@/lib/sanitize";
import { formatDate } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/misc";

export async function generateMetadata({ params }: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { type: "article", title: post.title, description: post.excerpt ?? undefined, images: post.cover_url ? [post.cover_url] : undefined },
  };
}

export default function PostPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10"><PageSkeleton /></div>}>
      <PostView params={params} />
    </Suspense>
  );
}

async function PostView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const t = await getTranslations("news");
  const nav = await getTranslations("nav");
  const locale = await getLocale();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href={post.kind === "story" ? "/stories" : "/news"} className="text-sm font-semibold text-secondary hover:underline">
        ← {post.kind === "story" ? nav("stories") : nav("news")}
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold leading-tight text-secondary sm:text-4xl">{post.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("published", { date: formatDate(post.published_at ?? post.created_at, locale) })}</p>
      {post.cover_url && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
          <Image src={post.cover_url} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
        </div>
      )}
      {post.excerpt && <p className="mt-6 text-lg font-medium text-secondary/90">{post.excerpt}</p>}
      <div className="prose-content mt-4" dangerouslySetInnerHTML={{ __html: sanitize(post.body) }} />
    </article>
  );
}
