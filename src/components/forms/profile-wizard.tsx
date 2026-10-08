"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { saveProfile, setProfileFile } from "@/app/actions/profile";
import { profileSchema } from "@/lib/validations";
import { EDUCATION_LEVELS, REGIONS, type Profile } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { SelectField, SubmitButton, TextAreaField, TextField } from "./fields";
import { FileUpload } from "./file-upload";
import { CvLink } from "./cv-link";
import { useActionForm } from "./use-action-form";

type Values = {
  full_name: string;
  gender: string;
  date_of_birth: string;
  region: string;
  district: string;
  phone: string;
  education_level: string;
  skills: string;
  languages: string;
  bio: string;
  preferred_language: "so" | "en";
  mentor_expertise: string;
  mentor_availability: string;
};

const STEPS: { key: "stepBasics" | "stepLocation" | "stepEducation" | "stepFiles"; fields: (keyof Values)[] }[] = [
  { key: "stepBasics", fields: ["full_name", "gender", "date_of_birth", "preferred_language"] },
  { key: "stepLocation", fields: ["region", "district", "phone"] },
  { key: "stepEducation", fields: ["education_level", "skills", "languages", "bio", "mentor_expertise", "mentor_availability"] },
  { key: "stepFiles", fields: [] },
];

export function ProfileWizard({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const tg = useTranslations("gender");
  const te = useTranslations("education");
  const common = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [cvPath, setCvPath] = useState(profile.cv_path);
  const isMentor = profile.role === "mentor";

  const { form, onSubmit, pending } = useActionForm<Values>({
    schema: profileSchema,
    defaultValues: {
      full_name: profile.full_name ?? "",
      gender: profile.gender ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      region: profile.region ?? "",
      district: profile.district ?? "",
      phone: profile.phone ?? "",
      education_level: profile.education_level ?? "",
      skills: profile.skills.join(", "),
      languages: profile.languages.join(", "),
      bio: profile.bio ?? "",
      preferred_language: profile.preferred_language ?? "en",
      mentor_expertise: profile.mentor_expertise.join(", "),
      mentor_availability: profile.mentor_availability ?? "",
    },
    action: saveProfile,
    successMessage: t("saved"),
    onSuccess: () => router.refresh(),
  });

  async function goNext() {
    const ok = await form.trigger(STEPS[step].fields);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onFile(kind: "avatar" | "cv", path: string) {
    const res = await setProfileFile(kind, path);
    if (!res.ok) {
      toast.error(common("error"));
      return;
    }
    if (kind === "avatar") {
      // reflect immediately; the public URL is derived on the server
      setAvatar(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`);
    } else setCvPath(path);
    toast.success(t("saved"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
      {/* stepper */}
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label={t("step", { current: step + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => (i < step ? setStep(i) : undefined)}
              className={cn("flex w-full flex-col items-start gap-1.5 text-left", i > step && "cursor-default")}
              aria-current={i === step ? "step" : undefined}
            >
              <span className={cn("h-1.5 w-full rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
              <span className={cn("hidden text-xs font-semibold sm:block", i === step ? "text-secondary" : "text-muted-foreground")}>{t(s.key)}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{t("step", { current: step + 1, total: STEPS.length })}</p>
      <h2 className="mb-5 text-xl font-bold text-secondary">{t(STEPS[step].key)}</h2>

      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 0 && "hidden")}>
        <TextField form={form} name="full_name" label={t("fullName")} autoComplete="name" className="sm:col-span-2" />
        <SelectField
          form={form}
          name="gender"
          label={t("gender")}
          hint={t("genderHint")}
          placeholder={t("selectGender")}
          options={(["female", "male"] as const).map((g) => ({ value: g, label: tg(g) }))}
        />
        <TextField form={form} name="date_of_birth" label={t("dob")} type="date" optional />
        <SelectField
          form={form}
          name="preferred_language"
          label={t("preferredLanguage")}
          options={[
            { value: "so", label: "Soomaali" },
            { value: "en", label: "English" },
          ]}
        />
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 1 && "hidden")}>
        <SelectField form={form} name="region" label={t("region")} placeholder={t("selectRegion")} optional options={REGIONS.map((r) => ({ value: r, label: r }))} />
        <TextField form={form} name="district" label={t("district")} optional />
        <TextField form={form} name="phone" label={t("phone")} placeholder={t("phonePlaceholder")} type="tel" inputMode="tel" autoComplete="tel" optional />
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 2 && "hidden")}>
        <SelectField
          form={form}
          name="education_level"
          label={t("educationLevel")}
          placeholder={t("selectEducation")}
          optional
          options={EDUCATION_LEVELS.map((e) => ({ value: e, label: te(e) }))}
        />
        <TextField form={form} name="languages" label={t("languages")} hint={t("languagesHint")} optional />
        <TextField form={form} name="skills" label={t("skills")} hint={t("skillsHint")} optional className="sm:col-span-2" />
        <TextAreaField form={form} name="bio" label={t("bio")} hint={t("bioHint")} optional className="sm:col-span-2" />
        {isMentor && (
          <>
            <h3 className="pt-2 font-bold text-secondary sm:col-span-2">{t("mentorSection")}</h3>
            <TextField form={form} name="mentor_expertise" label={t("expertise")} hint={t("expertiseHint")} />
            <TextField form={form} name="mentor_availability" label={t("availability")} hint={t("availabilityHint")} />
          </>
        )}
      </div>

      <div className={cn("space-y-6", step !== 3 && "hidden")}>
        <div className="flex items-center gap-4">
          <div className="relative size-20 overflow-hidden rounded-full bg-muted">
            {avatar ? (
              <Image src={avatar} alt="" fill sizes="80px" className="object-cover" unoptimized />
            ) : (
              <UserRound className="absolute inset-0 m-auto size-10 text-muted-foreground" />
            )}
          </div>
          <FileUpload kind="image" bucket="avatars" userId={profile.id} label={t("avatar")} onUploaded={(p) => onFile("avatar", p)} />
        </div>
        <div className="space-y-2">
          <FileUpload kind="cv" bucket="cvs" userId={profile.id} label={t("cv")} onUploaded={(p) => onFile("cv", p)} />
          {cvPath && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 text-secondary" /> {t("currentCv")}: <CvLink path={cvPath} label={t("viewCv")} />
            </p>
          )}
        </div>
      </div>

      <Progress value={((step + 1) / STEPS.length) * 100} className="mt-8" label={t("step", { current: step + 1, total: STEPS.length })} />
      <div className="mt-5 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft />
          {common("previous")}
        </Button>
        {step < STEPS.length - 1 ? (
          <div className="flex gap-2">
            <SubmitButton pending={pending} variant="outline">
              {t("finish")}
            </SubmitButton>
            <Button type="button" onClick={goNext}>
              {common("next")}
              <ChevronRight />
            </Button>
          </div>
        ) : (
          <SubmitButton pending={pending}>{t("finish")}</SubmitButton>
        )}
      </div>
    </form>
  );
}
