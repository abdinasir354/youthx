import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourseBySlug } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import { sanitize } from "@/lib/sanitize";
import { CompleteLessonButton } from "@/components/courses/enroll-button";
import { buttonVariants } from "@/components/ui/button";
import { PageSkeleton, Skeleton } from "@/components/ui/misc";

export async function generateMetadata({ params }: PageProps<"/[locale]/courses/[slug]/[lessonId]">): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  return lesson ? { title: `${lesson.title} · ${course!.title}` } : {};
}

/** Turn a YouTube / Vimeo link into a privacy-friendly embed URL. Anything else is not embedded. */
function embedUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}

export default function LessonPage({ params }: PageProps<"/[locale]/courses/[slug]/[lessonId]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-10"><PageSkeleton /></div>}>
      <LessonView params={params} />
    </Suspense>
  );
}

async function LessonView({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  if (!course || index === -1) notFound();
  const lesson = course.lessons[index];
  const prev = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  const t = await getTranslations("courses");
  const video = embedUrl(lesson.video_url);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/courses/${course.slug}`} className="text-sm font-semibold text-secondary hover:underline">
        ← {t("backToCourse")}: {course.title}
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {index + 1} / {course.lessons.length}
      </p>
      <h1 className="mt-1 text-3xl font-extrabold text-secondary">{lesson.title}</h1>

      {video && (
        <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            src={video}
            title={lesson.title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      )}
      {lesson.content && <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: sanitize(lesson.content) }} />}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        {prev ? (
          <Link href={`/courses/${course.slug}/${prev.id}`} className={buttonVariants({ variant: "ghost" })}>
            <ChevronLeft /> {t("prevLesson")}
          </Link>
        ) : (
          <span />
        )}
        <Suspense fallback={<Skeleton className="h-11 w-40" />}>
          <CompletePanel lessonId={lesson.id} courseId={course.id} nextHref={next ? `/courses/${course.slug}/${next.id}` : null} />
        </Suspense>
        {next ? (
          <Link href={`/courses/${course.slug}/${next.id}`} className={buttonVariants({ variant: "ghost" })}>
            {t("nextLesson")} <ChevronRight />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

async function CompletePanel({ lessonId, courseId, nextHref }: { lessonId: string; courseId: string; nextHref: string | null }) {
  const t = await getTranslations("courses");
  const user = await getCurrentUser();
  if (!user)
    return (
      <Link href="/login" className={buttonVariants()}>
        {t("loginToEnroll")}
      </Link>
    );
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_progress").select("lesson_id").eq("lesson_id", lessonId).eq("user_id", user.id).maybeSingle();
  return <CompleteLessonButton lessonId={lessonId} courseId={courseId} initialDone={!!data} nextHref={nextHref} />;
}
