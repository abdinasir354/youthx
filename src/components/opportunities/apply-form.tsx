"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { applyToOpportunity } from "@/app/actions/applications";
import { applySchema } from "@/lib/validations";
import { Alert } from "@/components/ui/misc";
import { FileUpload } from "@/components/forms/file-upload";
import { SubmitButton, TextAreaField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import type { OpportunityQuestion } from "@/types/database.types";

type Values = { opportunity_id: string; motivation: string; cv_path: string; answers: Record<string, string> };

export function ApplyForm({ opportunityId, questions, userId, profileCvPath }: { opportunityId: string; questions: OpportunityQuestion[]; userId: string; profileCvPath: string | null }) {
  const t = useTranslations("apply");
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [uploadedCv, setUploadedCv] = useState<string | null>(null);

  const { form, onSubmit, pending } = useActionForm<Values>({
    schema: applySchema,
    defaultValues: {
      opportunity_id: opportunityId,
      motivation: "",
      cv_path: profileCvPath ?? "",
      answers: Object.fromEntries(questions.map((q) => [q.id, ""])),
    },
    action: applyToOpportunity,
    onSuccess: () => {
      setDone(true);
      router.refresh();
    },
  });

  if (done)
    return (
      <Alert variant="success">
        <span className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {t("success")}
        </span>
      </Alert>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <TextAreaField form={form} name="motivation" label={t("motivation")} hint={t("motivationHint")} rows={5} />
      {questions.map((q) => (
        <TextAreaField
          key={q.id}
          form={form}
          name={`answers.${q.id}`}
          label={q.label}
          optional={!q.required}
          rows={3}
          {...(q.required ? { required: true } : {})}
        />
      ))}
      <div className="space-y-2 rounded-xl bg-muted p-3 text-sm">
        {profileCvPath && !uploadedCv ? <p className="text-secondary">✓ {t("useProfileCv")}</p> : !uploadedCv && <p className="text-muted-foreground">{t("noCv")}</p>}
        <FileUpload
          kind="cv"
          bucket="cvs"
          userId={userId}
          label={profileCvPath ? t("uploadNewCv") : t("cv")}
          onUploaded={(path) => {
            setUploadedCv(path);
            form.setValue("cv_path", path);
          }}
        />
      </div>
      <SubmitButton pending={pending} className="w-full" size="lg">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
