import Image from "next/image";
import { useLocale } from "next-intl";
import { Quote } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/types/database.types";
import { PhotoPlaceholder } from "@/components/site/shapes";

export function StoryCard({ post }: { post: Post }) {
  return (
    <article className="relative flex h-full flex-col rounded-xl bg-secondary p-6 text-white">
      <Quote className="size-6 text-primary" aria-hidden />
      <h3 className="mt-3 text-lg font-semibold">
        <Link href={`/news/${post.slug}`} className="after:absolute after:inset-0">
          {post.title}
        </Link>
      </h3>
      {post.excerpt && <p className="mt-2 line-clamp-4 text-sm text-white/80">{post.excerpt}</p>}
    </article>
  );
}

export function PostCard({ post }: { post: Post }) {
  const locale = useLocale();
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white">
      <div className="relative aspect-[16/9] bg-secondary">
        {post.cover_url ? (
          <Image src={post.cover_url} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" loading="lazy" />
        ) : (
          <PhotoPlaceholder className="absolute inset-0" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted-foreground">{formatDate(post.published_at ?? post.created_at, locale)}</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug text-secondary">
          <Link href={`/news/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
      </div>
    </article>
  );
}
