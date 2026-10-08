"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cancelMentorship, requestMentorship, respondToMentorship } from "@/app/actions/learning";
import { mentorshipRequestSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SubmitButton, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm, useErrorText } from "@/components/forms/use-action-form";

export function MentorRequestForm({ mentorId }: { mentorId: string }) {
  const t = useTranslations("mentorship");
  const common = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending } = useActionForm<{ mentor_id: string; topic: string; message: string }>({
    schema: mentorshipRequestSchema,
    defaultValues: { mentor_id: mentorId, topic: "", message: "" },
    action: requestMentorship,
    successMessage: t("sent"),
    resetOnSuccess: true,
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        {t("request")}
      </Button>
    );
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <TextField form={form} name="topic" label={t("topic")} placeholder={t("topicPlaceholder")} />
      <TextAreaField form={form} name="message" label={t("messageLabel")} optional rows={3} />
      <div className="flex gap-2">
        <SubmitButton pending={pending} size="sm">
          {t("send")}
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {common("cancel")}
        </Button>
      </div>
    </form>
  );
}

export function CancelMentorshipButton({ id }: { id: string }) {
  const t = useTranslations("mentorship");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await cancelMentorship(id);
          if (res.ok) router.refresh();
          else toast.error(errorText(res.error));
        })
      }
    >
      {t("cancel")}
    </Button>
  );
}

/** Mentor side: accept / decline / complete with an optional reply. */
export function MentorResponse({ id, status }: { id: string; status: string }) {
  const t = useTranslations("mentor");
  const common = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();

  function respond(next: "accepted" | "declined" | "completed") {
    start(async () => {
      const res = await respondToMentorship({ id, status: next, response_message: reply });
      if (res.ok) {
        toast.success(common("success"));
        router.refresh();
      } else toast.error(errorText(res.error));
    });
  }

  if (status === "accepted")
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => respond("completed")}>
        {t("complete")}
      </Button>
    );
  if (status !== "pending") return null;
  return (
    <div className="space-y-2">
      <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("replyPlaceholder")} rows={2} maxLength={1000} className="min-h-0" />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => respond("accepted")}>
          {t("accept")}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => respond("declined")}>
          {t("decline")}
        </Button>
      </div>
    </div>
  );
}
