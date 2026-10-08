import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteLesson } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/controls";
import { CourseForm, EditableLesson, LessonForm } from "@/components/admin/content-forms";
import { PageHeader } from "@/components/ui/misc";
import type { Course, Lesson } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("courses"), robots: { index: false } };
}

export default async function EditCoursePage({ params }: PageProps<"/[locale]/admin/courses/[id]">) {
  await requireAdmin("content");
  const { id } = await params;
  const t = await getTranslations("admin");
  const tc = await getTranslations("courses");
  const common = await getTranslations("common");
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("*, lessons(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const course = data as Course & { lessons: Lesson[] };
  const lessons = [...course.lessons].sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title={course.title} />
      <CourseForm course={course} />
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-secondary">{tc("courseContent")}</h2>
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {lessons.map((l) => (
            <li key={l.id} className="p-4">
              <EditableLesson courseId={course.id} lesson={l}>
                <span className="font-medium text-secondary">
                  {l.position}. {l.title}
                </span>
                <ActionButton action={deleteLesson.bind(null, l.id)} variant="ghost" className="text-danger" confirmText={`${common("delete")}: ${l.title}?`}>
                  {common("delete")}
                </ActionButton>
              </EditableLesson>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl border border-dashed border-border bg-white p-5">
          <h3 className="mb-3 font-bold text-secondary">{t("newLesson")}</h3>
          <LessonForm courseId={course.id} nextPosition={(lessons.at(-1)?.position ?? 0) + 1} />
        </div>
      </section>
    </div>
  );
}
