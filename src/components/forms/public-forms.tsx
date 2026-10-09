"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { recordDonation, sendPartnerRequest } from "@/app/actions/public-forms";
import { donationSchema, partnerRequestSchema } from "@/lib/validations";
import { Alert } from "@/components/ui/misc";
import { CheckboxField, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";
import { useActionForm } from "./use-action-form";

function Success({ text }: { text: string }) {
  return (
    <Alert variant="success">
      <span className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        {text}
      </span>
    </Alert>
  );
}

export function PartnerRequestForm({ kind = "partner" }: { kind?: "partner" | "sponsor" }) {
  const t = useTranslations("partners");
  const ti = useTranslations("involve");
  const common = useTranslations("common");
  const [sent, setSent] = useState(false);
  const { form, onSubmit, pending } = useActionForm<{ kind: "partner" | "sponsor"; org_name: string; contact_name: string; email: string; phone: string; message: string; website: string }>({
    schema: partnerRequestSchema,
    defaultValues: { kind, org_name: "", contact_name: "", email: "", phone: "", message: "", website: "" },
    action: sendPartnerRequest,
    onSuccess: () => setSent(true),
  });
  if (sent) return <Success text={t("sent")} />;
  return (
    <form onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2" noValidate>
      <Honeypot form={form} />
      <TextField form={form} name="org_name" label={t("orgName")} className="sm:col-span-2" />
      <TextField form={form} name="contact_name" label={t("contactName")} autoComplete="name" />
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="email" />
      <TextField form={form} name="phone" label={common("phone")} type="tel" optional />
      <TextAreaField
        form={form}
        name="message"
        label={kind === "sponsor" ? ti("sponsorMessage") : ti("partnerMessage")}
        optional
        rows={5}
        className="sm:col-span-2"
      />
      <SubmitButton pending={pending} size="lg" className="sm:col-span-2 sm:justify-self-start">
        {kind === "sponsor" ? ti("submitSponsor") : ti("submitPartner")}
      </SubmitButton>
    </form>
  );
}

export function DonationForm() {
  const t = useTranslations("donate");
  const tm = useTranslations("methods");
  const common = useTranslations("common");
  const [sent, setSent] = useState(false);
  const { form, onSubmit, pending } = useActionForm<{
    donor_name: string; donor_email: string; donor_phone: string; amount: string; currency: string; method: string; reference: string; message: string; is_anonymous: boolean; website: string;
  }>({
    schema: donationSchema,
    defaultValues: { donor_name: "", donor_email: "", donor_phone: "", amount: "", currency: "USD", method: "evc_plus", reference: "", message: "", is_anonymous: false, website: "" },
    action: recordDonation,
    onSuccess: () => setSent(true),
  });
  if (sent) return <Success text={t("thanks")} />;
  return (
    <form onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2" noValidate>
      <Honeypot form={form} />
      <TextField form={form} name="amount" label={t("amount")} type="number" inputMode="decimal" min="1" step="0.01" />
      <SelectField form={form} name="currency" label={t("currency")} options={[{ value: "USD", label: "USD ($)" }, { value: "SOS", label: "SOS" }]} />
      <SelectField
        form={form}
        name="method"
        label={t("method")}
        options={(["evc_plus", "zaad", "sahal", "bank", "other"] as const).map((m) => ({ value: m, label: tm(m) }))}
      />
      <TextField form={form} name="reference" label={t("reference")} hint={t("referenceHint")} />
      <TextField form={form} name="donor_name" label={common("name")} autoComplete="name" optional />
      <TextField form={form} name="donor_phone" label={common("phone")} type="tel" optional />
      <TextField form={form} name="donor_email" label={common("email")} type="email" optional className="sm:col-span-2" />
      <TextAreaField form={form} name="message" label={t("messageLabel")} rows={3} className="sm:col-span-2" />
      <CheckboxField form={form} name="is_anonymous" label={t("anonymous")} className="sm:col-span-2" />
      <SubmitButton pending={pending} size="lg" className="sm:col-span-2">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
