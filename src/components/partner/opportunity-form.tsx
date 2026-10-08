"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { saveOpportunity } from "@/app/actions/partner";
import { opportunitySchema, toEatDay } from "@/lib/validations";
import { seatSplit } from "@/lib/utils";
import { OPPORTUNITY_TYPES, REGIONS, type Opportunity } from "@/types/database.types";
import { Alert } from "@/components/ui/misc";
import { CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";

type Values = {
  title: string; type: string; summary: string; description: string; requirements: string; region: string; is_remote: boolean;
  capacity: string; min_age: string; max_age: string; apply_deadline: string; starts_at: string; ends_at: string; questions_text: string; submit: boolean;
};

export function OpportunityForm({ opportunity, afterSaveHref = "/partner" }: { opportunity?: Opportunity; afterSaveHref?: string }) {
  const t = useTranslations("partner");
  const tf = useTranslations("partner.fields");
  const tt = useTranslations("types");
  const ts = useTranslations("oppStatus");
  const router = useRouter();
  const o = opportunity;

  const { form, onSubmit, pending } = useActionForm<Values, string>({
    schema: opportunitySchema,
    defaultValues: {
      title: o?.title ?? "",
      type: o?.type ?? "training",
      summary: o?.summary ?? "",
      description: o?.description ?? "",
      requirements: o?.requirements ?? "",
      region: o?.region ?? "",
      is_remote: o?.is_remote ?? false,
      capacity: o?.capacity != null ? String(o.capacity) : "",
      min_age: String(o?.min_age ?? 15),
      max_age: String(o?.max_age ?? 35),
      apply_deadline: toEatDay(o?.apply_deadline),
      starts_at: toEatDay(o?.starts_at),
      ends_at: toEatDay(o?.ends_at),
      questions_text: (o?.questions ?? []).map((q) => q.label).join("\n"),
      submit: false,
    },
    action: (v) => saveOpportunity(v, o?.id),
    onSuccess: () => {
      toast.success(form.getValues("submit") ? t("submitted") : t("draftSaved"));
      router.push(afterSaveHref);
      router.refresh();
    },
  });

  const capacity = Number(form.watch("capacity"));
  const split = capacity > 0 ? seatSplit(capacity, o?.female_ratio ?? 0.75) : null;
  const canSubmit = !o || o.status === "draft";

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {o && o.status !== "draft" && <Alert>{ts(o.status)}</Alert>}
      <div className="grid gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm sm:grid-cols-2">
        <TextField form={form} name="title" label={tf("title")} className="sm:col-span-2" />
        <SelectField form={form} name="type" label={tf("type")} options={OPPORTUNITY_TYPES.map((v) => ({ value: v, label: tt(v) }))} />
        <SelectField form={form} name="region" label={tf("region")} placeholder="—" optional options={REGIONS.map((r) => ({ value: r, label: r }))} />
        <CheckboxField form={form} name="is_remote" label={tf("isRemote")} className="sm:col-span-2" />
        <TextField form={form} name="summary" label={tf("summary")} optional className="sm:col-span-2" />
        <TextAreaField form={form} name="description" label={tf("description")} rows={8} optional className="sm:col-span-2" />
        <TextAreaField form={form} name="requirements" label={tf("requirements")} rows={5} optional className="sm:col-span-2" />
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm sm:grid-cols-3">
        <div className="sm:col-span-3">
          <TextField form={form} name="capacity" label={tf("capacity")} hint={tf("capacityHint")} type="number" min="1" inputMode="numeric" optional />
          {split && <p className="mt-2 rounded-lg bg-primary-soft px-3 py-2 text-sm font-semibold text-secondary">{t("seatPreview", split)}</p>}
        </div>
        <TextField form={form} name="min_age" label={tf("minAge")} type="number" min="15" max="35" />
        <TextField form={form} name="max_age" label={tf("maxAge")} type="number" min="15" max="35" />
        <TextField form={form} name="apply_deadline" label={tf("deadline")} type="date" optional />
        <TextField form={form} name="starts_at" label={tf("startsAt")} type="date" optional />
        <TextField form={form} name="ends_at" label={tf("endsAt")} type="date" optional />
        <TextAreaField form={form} name="questions_text" label={tf("questions")} hint={tf("questionsHint")} rows={4} optional className="sm:col-span-3" />
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} variant="outline" onClick={() => form.setValue("submit", false)}>
          {t("saveDraft")}
        </SubmitButton>
        {canSubmit && (
          <SubmitButton pending={pending} onClick={() => form.setValue("submit", true)}>
            {t("submitForReview")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
