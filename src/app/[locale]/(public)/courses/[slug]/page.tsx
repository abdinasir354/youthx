import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourseBySlug } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import { EnrollButton } from "@/components/courses/enroll-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageSkeleton, Progress, Skeleton } from "@/components/ui/misc";
import type { Course, Lesson } from "@/types/database.types";

export async function generateMetadata({ params }: PageProps<"/[locale]/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return course ? { title: course.title, description: course.description ?? undefined } : {};
}

export default function CoursePage({ params }: PageProps<"/[locale]/courses/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-10"><PageSkeleton /></div>}>
      <CourseDetail params={params} />
    </Suspense>
  );
}

async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const t = await getTranslations("courses");

  return (
    <>
      <section className="bg-secondary py-12 text-white">
        <div className="mx-auto max-w-5xl px-4">
          {course.category && <Badge>{course.category}</Badge>}
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{course.title}</h1>
          {course.description && <p className="mt-3 max-w-3xl text-white/80">{course.description}</p>}
          <p className="mt-4 text-sm text-white/70">{t("lessons", { count: course.lessons.length })}{course.level ? ` · ${course.level}` : ""}</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_300px]">
        <section>
          <h2 className="mb-4 text-xl font-bold text-secondary">{t("courseContent")}</h2>
          <Suspense fallback={<LessonList course={course} done={new Set()} />}>
            <LessonListWithProgress course={course} />
          </Suspense>
        </section>
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <Suspense fallback={<Skeleton className="h-24" />}>
              <EnrollPanel course={course} />
            </Suspense>
          </div>
        </aside>
      </div>
    </>
  );
}

async function getProgress(course: Course & { lessons: Lesson[] }) {
  const user = await getCurrentUser();
  if (!user) return { user: null, enrolled: false, done: new Set<string>() };
  const supabase = await createClient();
  const [{ data: enrollment }, { data: progress }] = await Promise.all([
    supabase.from("enrollments").select("course_id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).in("lesson_id", course.lessons.map((l) => l.id)),
  ]);
  return { user, enrolled: !!enrollment, done: new Set((progress ?? []).map((p) => p.lesson_id as string)) };
}

async function LessonListWithProgress({ course }: { course: Course & { lessons: Lesson[] } }) {
  const { done } = await getProgress(course);
  return <LessonList course={course} done={done} />;
}

function LessonList({ course, done }: { course: Course & { lessons: Lesson[] }; done: Set<string> }) {
  const common = useTranslations("common");
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
      {course.lessons.map((l, i) => (
        <li key={l.id}>
          <Link href={`/courses/${course.slug}/${l.id}`} className="flex items-center gap-3 p-4 hover:bg-muted">
            {done.has(l.id) ? <CheckCircle2 className="size-5 shrink-0 text-secondary" /> : <Circle className="size-5 shrink-0 text-border" />}
            <span className="flex-1 font-medium text-secondary">
              {i + 1}. {l.title}
            </span>
            {l.duration_minutes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {common("minutes", { count: l.duration_minutes })}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

async function EnrollPanel({ course }: { course: Course & { lessons: Lesson[] } }) {
  const t = await getTranslations("courses");
  const { user, enrolled, done } = await getProgress(course);
  const first = course.lessons[0];
  const nextLesson = course.lessons.find((l) => !done.has(l.id)) ?? first;

  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ className: "w-full" })}>
        {t("loginToEnroll")}
      </Link>
    );
  }
  if (!enrolled) return <EnrollButton courseId={course.id} firstLessonHref={first ? `/courses/${course.slug}/${first.id}` : null} />;

  const total = course.lessons.length;
  return (
    <div className="space-y-3">
      <Progress value={total ? (done.size / total) * 100 : 0} label={t("progress", { done: done.size, total })} />
      <p className="text-sm text-muted-foreground">{t("progress", { done: done.size, total })}</p>
      {done.size === total && total > 0 ? (
        <p className="font-semibold text-secondary">{t("certificate")}</p>
      ) : (
        nextLesson && (
          <Link href={`/courses/${course.slug}/${nextLesson.id}`} className={buttonVariants({ className: "w-full" })}>
            {t("continue")}
          </Link>
        )
      )}
    </div>
  );
}
