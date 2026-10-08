"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveCourse, saveLesson, savePost } from "@/app/actions/admin";
import { courseSchema, lessonSchema, postSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import type { Course, Lesson, Post } from "@/types/database.types";

const LANGS = [
  { value: "so", label: "Soomaali" },
  { value: "en", label: "English" },
];

export function CourseForm({ course }: { course?: Course }) {
  const t = useTranslations("admin.courseFields");
  const common = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<{
    id?: string; title: string; slug: string; description: string; category: string; level: string; language: string; cover_url: string; is_published: boolean;
  }, string>({
    schema: courseSchema,
    defaultValues: {
      id: course?.id,
      title: course?.title ?? "",
      slug: course?.slug ?? "",
      description: course?.description ?? "",
      category: course?.category ?? "",
      level: course?.level ?? "",
      language: course?.language ?? "en",
      cover_url: course?.cover_url ?? "",
      is_published: course?.is_published ?? false,
    },
    action: saveCourse,
    successMessage: common("saved"),
    onSuccess: ({ data }) => {
      if (!course && data) router.push(`/admin/courses/${data}`);
      router.refresh();
    },
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm sm:grid-cols-2" noValidate>
      <TextField
        form={form}
        name="title"
        label={t("title")}
        onBlur={(e) => !form.getValues("slug") && form.setValue("slug", slugify(e.target.value))}
      />
      <TextField form={form} name="slug" label={t("slug")} />
      <TextAreaField form={form} name="description" label={t("description")} rows={4} optional className="sm:col-span-2" />
      <TextField form={form} name="category" label={t("category")} optional />
      <TextField form={form} name="level" label={t("level")} optional />
      <SelectField form={form} name="language" label={t("language")} options={LANGS} />
      <TextField form={form} name="cover_url" label={t("coverUrl")} type="url" optional />
      <CheckboxField form={form} name="is_published" label={t("published")} className="sm:col-span-2" />
      <SubmitButton pending={pending} className="sm:justify-self-start">{common("save")}</SubmitButton>
    </form>
  );
}

export function LessonForm({ courseId, lesson, nextPosition = 0, onDone }: { courseId: string; lesson?: Lesson; nextPosition?: number; onDone?: () => void }) {
  const t = useTranslations("admin.lessonFields");
  const common = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<{
    id?: string; course_id: string; title: string; content: string; video_url: string; position: string; duration_minutes: string;
  }>({
    schema: lessonSchema,
    defaultValues: {
      id: lesson?.id,
      course_id: courseId,
      title: lesson?.title ?? "",
      content: lesson?.content ?? "",
      video_url: lesson?.video_url ?? "",
      position: String(lesson?.position ?? nextPosition),
      duration_minutes: lesson?.duration_minutes != null ? String(lesson.duration_minutes) : "",
    },
    action: saveLesson,
    successMessage: common("saved"),
    resetOnSuccess: !lesson,
    onSuccess: () => {
      onDone?.();
      router.refresh();
    },
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4" noValidate>
      <TextField form={form} name="title" label={t("title")} className="sm:col-span-2" />
      <TextField form={form} name="position" label={t("position")} type="number" min="0" />
      <TextField form={form} name="duration_minutes" label={t("duration")} type="number" min="1" optional />
      <TextField form={form} name="video_url" label={t("videoUrl")} type="url" optional className="sm:col-span-4" />
      <TextAreaField form={form} name="content" label={t("content")} rows={5} optional className="sm:col-span-4" />
      <div className="flex gap-2 sm:col-span-4">
        <SubmitButton pending={pending} size="sm">{common("save")}</SubmitButton>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            {common("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

export function EditableLesson({ courseId, lesson, children }: { courseId: string; lesson: Lesson; children: React.ReactNode }) {
  const common = useTranslations("common");
  const [editing, setEditing] = useState(false);
  if (editing) return <LessonForm courseId={courseId} lesson={lesson} onDone={() => setEditing(false)} />;
  return (
    <div className="flex items-center justify-between gap-2">
      {children}
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        {common("edit")}
      </Button>
    </div>
  );
}

export function PostForm({ post }: { post?: Post }) {
  const t = useTranslations("admin.postFields");
  const common = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<{
    id?: string; kind: string; title: string; slug: string; excerpt: string; body: string; cover_url: string; language: string; is_published: boolean;
  }, string>({
    schema: postSchema,
    defaultValues: {
      id: post?.id,
      kind: post?.kind ?? "news",
      title: post?.title ?? "",
      slug: post?.slug ?? "",
      excerpt: post?.excerpt ?? "",
      body: post?.body ?? "",
      cover_url: post?.cover_url ?? "",
      language: post?.language ?? "en",
      is_published: post?.is_published ?? false,
    },
    action: savePost,
    successMessage: common("saved"),
    onSuccess: ({ data }) => {
      if (!post && data) router.push(`/admin/posts/${data}`);
      router.refresh();
    },
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm sm:grid-cols-2" noValidate>
      <SelectField form={form} name="kind" label={t("kind")} options={[{ value: "news", label: t("news") }, { value: "story", label: t("story") }]} />
      <SelectField form={form} name="language" label={t("language")} options={LANGS} />
      <TextField form={form} name="title" label={t("title")} onBlur={(e) => !form.getValues("slug") && form.setValue("slug", slugify(e.target.value))} />
      <TextField form={form} name="slug" label={t("slug")} />
      <TextAreaField form={form} name="excerpt" label={t("excerpt")} rows={2} optional className="sm:col-span-2" />
      <TextAreaField form={form} name="body" label={t("body")} rows={14} optional className="font-mono text-xs sm:col-span-2" />
      <TextField form={form} name="cover_url" label={t("coverUrl")} type="url" optional className="sm:col-span-2" />
      <CheckboxField form={form} name="is_published" label={t("published")} className="sm:col-span-2" />
      <SubmitButton pending={pending} className="sm:justify-self-start">{common("save")}</SubmitButton>
    </form>
  );
}
