"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileText, X } from "lucide-react";
import { submitMentorApplication, submitVolunteerApplication } from "@/app/actions/public-forms";
import { mentorApplicationSchema, volunteerSchema } from "@/lib/validations";
import { Alert } from "@/components/ui/misc";
import { Label } from "@/components/ui/input";
import { Honeypot, SubmitButton, TextAreaField, TextField } from "./fields";
import { useActionForm } from "./use-action-form";

function Success({ title, text }: { title: string; text: string }) {
  return (
    <Alert variant="success" className="p-5">
      <span className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block">{text}</span>
        </span>
      </span>
    </Alert>
  );
}

/** Optional PDF CV, checked in the browser (type + 5 MB) and again on the server. */
function CvInput({ file, onChange, error, onError }: { file: File | null; onChange: (f: File | null) => void; error: string | null; onError: (e: string | null) => void }) {
  const t = useTranslations("involve");
  const id = useId();
  return (
    <div className="sm:col-span-2">
      <Label htmlFor={id}>
        {t("cv")} <span className="ml-1 text-xs font-normal text-muted-foreground">({t("optional")})</span>
      </Label>
      {file ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 text-sm">
          <FileText className="size-4 text-secondary" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <button type="button" onClick={() => onChange(null)} className="rounded p-1 text-muted-foreground hover:text-danger" aria-label={t("removeCv")}>
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (!f) return;
            if (!/\.pdf$/i.test(f.name) || (f.type && f.type !== "application/pdf")) return onError(t("cvPdfOnly"));
            if (f.size > 5 * 1024 * 1024) return onError(t("cvTooBig"));
            onError(null);
            onChange(f);
          }}
          className="block w-full rounded-xl border border-dashed border-border bg-white px-3 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
      )}
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">{t("cvHint")}</p>
      {error && <p role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function withCv(values: unknown, cv: File | null) {
  const fd = new FormData();
  fd.append("data", JSON.stringify(values));
  if (cv) fd.append("cv", cv);
  return fd;
}

type VolunteerValues = {
  full_name: string; email: string; phone: string; location: string; skills: string; interests: string;
  experience: string; availability: string; motivation: string; portfolio_url: string; website: string;
};

export function VolunteerForm() {
  const t = useTranslations("involve");
  const common = useTranslations("common");
  const [cv, setCv] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { form, onSubmit, pending } = useActionForm<VolunteerValues>({
    schema: volunteerSchema,
    defaultValues: { full_name: "", email: "", phone: "", location: "", skills: "", interests: "", experience: "", availability: "", motivation: "", portfolio_url: "", website: "" },
    action: (v) => submitVolunteerApplication(withCv(v, cv)),
    onSuccess: () => setSent(true),
  });
  if (sent) return <Success title={t("thanks")} text={t("volunteerSent")} />;
  return (
    <form onSubmit={onSubmit} className="relative grid gap-5 sm:grid-cols-2" noValidate>
      <Honeypot form={form} />
      <TextField form={form} name="full_name" label={t("fullName")} autoComplete="name" className="sm:col-span-2" />
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="email" />
      <TextField form={form} name="phone" label={common("phone")} type="tel" autoComplete="tel" optional />
      <TextField form={form} name="location" label={t("location")} autoComplete="address-level2" optional />
      <TextField form={form} name="availability" label={t("availability")} placeholder={t("availabilityHint")} optional />
      <TextField form={form} name="skills" label={t("skills")} hint={t("commaHint")} optional className="sm:col-span-2" />
      <TextField form={form} name="interests" label={t("interests")} hint={t("interestsHint")} optional className="sm:col-span-2" />
      <TextAreaField form={form} name="experience" label={t("experience")} rows={3} optional className="sm:col-span-2" />
      <TextAreaField form={form} name="motivation" label={t("motivation")} rows={4} hint={t("motivationHint")} className="sm:col-span-2" />
      <TextField form={form} name="portfolio_url" label={t("portfolio")} type="url" placeholder="https://" optional className="sm:col-span-2" />
      <CvInput file={cv} onChange={setCv} error={cvError} onError={setCvError} />
      <SubmitButton pending={pending} size="lg" className="sm:col-span-2 sm:justify-self-start">
        {t("submitVolunteer")}
      </SubmitButton>
    </form>
  );
}

type MentorValues = {
  full_name: string; email: string; phone: string; professional_field: string; organization: string; years_experience: string;
  skills: string; website_url: string; mentor_areas: string; availability: string; bio: string; motivation: string; website: string;
};

export function MentorApplicationForm() {
  const t = useTranslations("involve");
  const common = useTranslations("common");
  const [cv, setCv] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { form, onSubmit, pending } = useActionForm<MentorValues>({
    schema: mentorApplicationSchema,
    defaultValues: { full_name: "", email: "", phone: "", professional_field: "", organization: "", years_experience: "", skills: "", website_url: "", mentor_areas: "", availability: "", bio: "", motivation: "", website: "" },
    action: (v) => submitMentorApplication(withCv(v, cv)),
    onSuccess: () => setSent(true),
  });
  if (sent) return <Success title={t("thanks")} text={t("mentorSent")} />;
  return (
    <form onSubmit={onSubmit} className="relative grid gap-5 sm:grid-cols-2" noValidate>
      <Honeypot form={form} />
      <TextField form={form} name="full_name" label={t("fullName")} autoComplete="name" className="sm:col-span-2" />
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="email" />
      <TextField form={form} name="phone" label={common("phone")} type="tel" autoComplete="tel" optional />
      <TextField form={form} name="professional_field" label={t("professionalField")} placeholder={t("professionalFieldHint")} />
      <TextField form={form} name="organization" label={t("organization")} autoComplete="organization" optional />
      <TextField form={form} name="years_experience" label={t("yearsExperience")} type="number" inputMode="numeric" min={0} max={70} optional />
      <TextField form={form} name="availability" label={t("availability")} placeholder={t("availabilityHint")} optional />
      <TextField form={form} name="skills" label={t("skills")} hint={t("commaHint")} optional className="sm:col-span-2" />
      <TextField form={form} name="mentor_areas" label={t("mentorAreas")} hint={t("mentorAreasHint")} optional className="sm:col-span-2" />
      <TextField form={form} name="website_url" label={t("linkedin")} type="url" placeholder="https://" optional className="sm:col-span-2" />
      <TextAreaField form={form} name="bio" label={t("bio")} rows={3} optional className="sm:col-span-2" />
      <TextAreaField form={form} name="motivation" label={t("mentorMotivation")} rows={4} hint={t("motivationHint")} className="sm:col-span-2" />
      <CvInput file={cv} onChange={setCv} error={cvError} onError={setCvError} />
      <SubmitButton pending={pending} size="lg" className="sm:col-span-2 sm:justify-self-start">
        {t("submitMentor")}
      </SubmitButton>
    </form>
  );
}
