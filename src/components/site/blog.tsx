import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/database.types";
import { formatLongDate } from "./basics";
import { PhotoPlaceholder } from "./shapes";

function readingTime(text: string | null) {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Large first article on the blog page. */
export function FeaturedPost({ post }: { post: Post }) {
  const t = useTranslations("site");
  return (
    <article className="group relative grid overflow-hidden rounded-[2rem] border border-border bg-white transition duration-[400ms] ease-soft hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(18,53,46,0.4)] lg:grid-cols-[1.15fr_1fr]">
      <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[22rem]">
        {post.cover_url ? (
          <Image src={post.cover_url} alt="" fill preload sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]" />
        ) : (
          <PhotoPlaceholder className="absolute inset-0" />
        )}
      </div>
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5f8500]">
          {t("latestPost")} · {formatLongDate(post.published_at ?? post.created_at)}
        </p>
        <h2 className="heading mt-3 text-3xl text-ink sm:text-4xl">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="mt-4 line-clamp-4 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        <p className="mt-6 flex items-center gap-2 font-semibold text-ink">
          {t("readArticle")} <ArrowRight className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1" aria-hidden />
        </p>
      </div>
    </article>
  );
}

export function PostCard({ post, className }: { post: Post; className?: string }) {
  const t = useTranslations("site");
  return (
    <article className={cn("group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-white transition duration-[350ms] ease-soft hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-28px_rgba(18,53,46,0.4)]", className)}>
      <div className="relative aspect-[16/10] overflow-hidden">
        {post.cover_url ? (
          <Image src={post.cover_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]" />
        ) : (
          <PhotoPlaceholder className="absolute inset-0" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold text-muted-foreground">
          {formatLongDate(post.published_at ?? post.created_at)} · {t("minRead", { count: readingTime(post.excerpt) })}
        </p>
        <h3 className="heading mt-2 text-xl text-ink">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>}
      </div>
    </article>
  );
}

export { readingTime };
