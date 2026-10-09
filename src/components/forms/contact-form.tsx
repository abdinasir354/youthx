"use client";

import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ArrowRight, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { sendContactMessage } from "@/app/actions/public-forms";
import { INQUIRY_TYPES, contactSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Honeypot } from "./fields";
import { useActionForm, useErrorText } from "./use-action-form";

type Values = { inquiry_type: string; name: string; email: string; phone: string; subject: string; message: string; website: string };

const line =
  "w-full border-0 border-b-2 border-border bg-transparent px-0 pb-2 pt-0.5 text-base text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none focus:ring-0 aria-[invalid=true]:border-danger";

/** Minimal field: small uppercase label, underlined input, inline error. */
function Line<V extends FieldValues>({ form, name, label, optional, className, children }: {
  form: UseFormReturn<V>;
  name: Path<V>;
  label: string;
  optional?: string;
  className?: string;
  children: (props: { id: string; invalid: boolean; describedBy?: string }) => React.ReactNode;
}) {
  const id = useId();
  const errorText = useErrorText();
  const err = errorText((form.formState.errors[name] as { message?: string } | undefined)?.message);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1.5 font-semibold normal-case tracking-normal text-muted-foreground">({optional})</span>}
      </label>
      {children({ id, invalid: Boolean(err), describedBy: err ? `${id}-err` : undefined })}
      {err && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {err}
        </p>
      )}
    </div>
  );
}

export function ContactForm() {
  const t = useTranslations("contact");
  const ti = useTranslations("involve");
  const ts = useTranslations("site");
  const common = useTranslations("common");
  const [sent, setSent] = useState(false);
  // "Contact us to apply" links pass ?type=…&subject=… so the form arrives pre-filled.
  const sp = useSearchParams();
  const presetType = sp.get("type") ?? "";
  const { form, onSubmit, pending } = useActionForm<Values>({
    schema: contactSchema,
    defaultValues: {
      inquiry_type: (INQUIRY_TYPES as readonly string[]).includes(presetType) ? presetType : "general",
      name: "",
      email: "",
      phone: "",
      subject: (sp.get("subject") ?? "").slice(0, 200),
      message: "",
      website: "",
    },
    action: sendContactMessage,
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-8">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-ink">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <p className="heading text-3xl text-ink">{ts("messageSentTitle")}</p>
        <p className="text-lg text-muted-foreground">{t("sent")}</p>
      </div>
    );
  }

  const opt = common("optional");
  return (
    <form onSubmit={onSubmit} className="relative grid gap-x-6 gap-y-5 sm:grid-cols-2" noValidate>
      <Honeypot form={form} />
      <Line form={form} name="name" label={ts("fullName")}>
        {(p) => <input id={p.id} aria-invalid={p.invalid} aria-describedby={p.describedBy} autoComplete="name" placeholder={ts("namePlaceholder")} className={line} {...form.register("name")} />}
      </Line>
      <Line form={form} name="email" label={ts("emailAddress")} optional={opt}>
        {(p) => <input id={p.id} type="email" inputMode="email" aria-invalid={p.invalid} aria-describedby={p.describedBy} autoComplete="email" placeholder="name@example.com" className={line} {...form.register("email")} />}
      </Line>
      <Line form={form} name="phone" label={common("phone")} optional={opt}>
        {(p) => <input id={p.id} type="tel" aria-invalid={p.invalid} aria-describedby={p.describedBy} autoComplete="tel" placeholder="+252 …" className={line} {...form.register("phone")} />}
      </Line>
      <Line form={form} name="inquiry_type" label={ti("inquiryTypeShort")}>
        {(p) => (
          <div className="relative">
            <select id={p.id} aria-invalid={p.invalid} className={cn(line, "appearance-none pr-8 font-semibold")} {...form.register("inquiry_type")}>
              {INQUIRY_TYPES.map((k) => (
                <option key={k} value={k}>{ti(`inquiry.${k}`)}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-2 size-5 text-ink" aria-hidden />
          </div>
        )}
      </Line>
      <Line form={form} name="subject" label={t("subject")} optional={opt} className="sm:col-span-2">
        {(p) => <input id={p.id} aria-invalid={p.invalid} aria-describedby={p.describedBy} placeholder={ts("subjectPlaceholder")} className={line} {...form.register("subject")} />}
      </Line>
      <Line form={form} name="message" label={common("message")} className="sm:col-span-2">
        {(p) => <textarea id={p.id} rows={3} aria-invalid={p.invalid} aria-describedby={p.describedBy} placeholder={ts("messagePlaceholder")} className={cn(line, "resize-y")} {...form.register("message")} />}
      </Line>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex h-12 items-center gap-3 rounded-lg bg-ink px-6 text-[15px] font-semibold text-white transition hover:bg-secondary-hover disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("send")} <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}
