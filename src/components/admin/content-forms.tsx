"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { savePost } from "@/app/actions/admin";
import { postSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import type { Post } from "@/types/database.types";

const LANGS = [
  { value: "so", label: "Soomaali" },
  { value: "en", label: "English" },
];

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
