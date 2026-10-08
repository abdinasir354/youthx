import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("courses"), robots: { index: false } };
}

type Row = { course_id: string; completed_at: string | null; course: { title: string; slug: string; category: string | null; lessons: { id: string }[] } | null };

export default async function MyCoursesPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("courses");
  const supabase = await createClient();
  const [{ data }, { data: progress }] = await Promise.all([
    supabase.from("enrollments").select("course_id, completed_at, course:courses(title, slug, category, lessons(id))").eq("user_id", user.id).order("enrolled_at", { ascending: false }),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
  ]);
  const done = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div>
      <PageHeader title={t("courses")} />
      {rows.length === 0 ? (
        <EmptyState icon={BookOpen} title={t("noCourses")}>
          <Link href="/courses" className={buttonVariants()}>
            {t("browseCourses")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const total = r.course?.lessons.length ?? 0;
            const finished = r.course?.lessons.filter((l) => done.has(l.id)).length ?? 0;
            return (
              <li key={r.course_id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.course?.category}</p>
                <h2 className="mt-1 font-bold text-secondary">{r.course?.title}</h2>
                <Progress value={total ? (finished / total) * 100 : 0} className="mt-4" label={r.course?.title} />
                <p className="mt-1 text-xs text-muted-foreground">{tc("progress", { done: finished, total })}</p>
                <div className="mt-4 flex items-center justify-between">
                  {r.completed_at ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-secondary">
                      <CheckCircle2 className="size-4" /> {tc("completed")}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Link href={`/courses/${r.course?.slug}`} className={buttonVariants({ size: "sm", variant: r.completed_at ? "outline" : "default" })}>
                    {tc("continue")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
