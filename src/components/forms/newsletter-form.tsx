"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { subscribeNewsletter } from "@/app/actions/public-forms";
import { newsletterSchema } from "@/lib/validations";
import { Honeypot, SubmitButton } from "./fields";
import { useActionForm } from "./use-action-form";

export function NewsletterForm() {
  const t = useTranslations("footer");
  const [done, setDone] = useState(false);
  const { form, onSubmit, pending, errorText } = useActionForm<{ email: string; website: string }>({
    schema: newsletterSchema,
    defaultValues: { email: "", website: "" },
    action: subscribeNewsletter,
    onSuccess: () => setDone(true),
  });
  if (done) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-primary">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("newsletterDone")}
      </p>
    );
  }
  const err = errorText(form.formState.errors.email?.message);
  return (
    <form onSubmit={onSubmit} className="relative" noValidate>
      <Honeypot form={form} />
      <label htmlFor="newsletter-email" className="sr-only">{t("newsletterEmail")}</label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("newsletterEmail")}
          aria-invalid={!!err}
          aria-describedby={err ? "newsletter-err" : undefined}
          className="h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white transition-colors duration-300 ease-soft placeholder:text-white/50 hover:border-white/40 focus:border-primary focus:outline-none"
          {...form.register("email")}
        />
        <SubmitButton pending={pending} className="h-11 rounded-md px-4">
          {t("subscribe")}
        </SubmitButton>
      </div>
      {err && <p id="newsletter-err" role="alert" className="mt-1.5 text-xs text-primary">{err}</p>}
      <p className="mt-2 text-xs text-white/50">{t("newsletterNote")}</p>
    </form>
  );
}
