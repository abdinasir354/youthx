"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { adminLogin, login, requestPasswordReset, sendMagicLink, signup, updatePassword } from "@/app/actions/auth";
import { emailOnlySchema, loginSchema, newPasswordSchema, signupSchema } from "@/lib/validations";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Honeypot, SubmitButton, TextField } from "./fields";
import { useActionForm } from "./use-action-form";

/** Back-office sign-in: email + password only (no magic link, no sign-up link). */
export function AdminLoginForm() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<{ email: string; password: string }>({
    schema: loginSchema,
    defaultValues: { email: "", password: "" },
    action: adminLogin,
    // The action set the session cookie, so the proxy lets this navigation into /admin.
    onSuccess: () => {
      router.replace("/admin");
      router.refresh();
    },
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="username" inputMode="email" />
      <TextField form={form} name="password" label={t("password")} type="password" autoComplete="current-password" />
      <SubmitButton pending={pending} className="w-full" variant="secondary">
        {t("login")}
      </SubmitButton>
    </form>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const next = useSearchParams().get("next") ?? undefined;
  const [magic, setMagic] = useState(false);

  const { form, onSubmit, pending } = useActionForm<{ email: string; password: string }>({
    schema: loginSchema,
    defaultValues: { email: "", password: "" },
    action: (v) => login(v, next),
    onSuccess: ({ message }) => {
      // `message` is a server-validated same-site path (already locale-prefixed when it came from ?next=)
      if (message) window.location.assign(message);
      else {
        router.replace("/dashboard");
        router.refresh();
      }
    },
  });

  if (magic) return <MagicLinkForm onBack={() => setMagic(false)} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="email" inputMode="email" />
      <TextField form={form} name="password" label={t("password")} type="password" autoComplete="current-password" />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-secondary underline-offset-4 hover:underline">
          {t("forgot")}
        </Link>
      </div>
      <SubmitButton pending={pending} className="w-full">
        {t("login")}
      </SubmitButton>
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={() => setMagic(true)}>
        <Mail />
        {t("magicLink")}
      </Button>
    </form>
  );
}

function MagicLinkForm({ onBack }: { onBack: () => void }) {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const [sent, setSent] = useState(false);
  const { form, onSubmit, pending } = useActionForm<{ email: string; website: string }>({
    schema: emailOnlySchema,
    defaultValues: { email: "", website: "" },
    action: sendMagicLink,
    onSuccess: () => setSent(true),
  });
  if (sent) return <Alert variant="success">{t("magicLinkSent")}</Alert>;
  return (
    <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
      <Honeypot form={form} />
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="email" />
      <SubmitButton pending={pending} className="w-full">
        <Mail />
        {t("magicLink")}
      </SubmitButton>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        {common("back")}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const [checkEmail, setCheckEmail] = useState(false);
  const { form, onSubmit, pending } = useActionForm<{ full_name: string; email: string; password: string; confirm: string; website: string }>({
    schema: signupSchema,
    defaultValues: { full_name: "", email: "", password: "", confirm: "", website: "" },
    action: signup,
    onSuccess: ({ message }) => {
      if (message === "signedIn") {
        router.replace("/dashboard/profile");
        router.refresh();
      } else setCheckEmail(true);
    },
  });

  if (checkEmail) return <Alert variant="success">{t("checkEmail")}</Alert>;

  return (
    <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
      <Honeypot form={form} />
      <TextField form={form} name="full_name" label={t("fullName")} autoComplete="name" />
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="email" inputMode="email" />
      <TextField form={form} name="password" label={t("password")} hint={t("passwordHint")} type="password" autoComplete="new-password" />
      <TextField form={form} name="confirm" label={t("confirmPassword")} type="password" autoComplete="new-password" />
      <SubmitButton pending={pending} className="w-full">
        {t("signup")}
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">{t("terms")}</p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const [sent, setSent] = useState(false);
  const { form, onSubmit, pending } = useActionForm<{ email: string; website: string }>({
    schema: emailOnlySchema,
    defaultValues: { email: "", website: "" },
    action: requestPasswordReset,
    onSuccess: () => setSent(true),
  });
  if (sent) return <Alert variant="success">{t("resetSent")}</Alert>;
  return (
    <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
      <Honeypot form={form} />
      <TextField form={form} name="email" label={common("email")} type="email" autoComplete="email" />
      <SubmitButton pending={pending} className="w-full">
        {t("sendReset")}
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<{ password: string; confirm: string }>({
    schema: newPasswordSchema,
    defaultValues: { password: "", confirm: "" },
    action: updatePassword,
    successMessage: t("passwordUpdated"),
    onSuccess: () => router.push("/dashboard"),
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <TextField form={form} name="password" label={t("newPassword")} hint={t("passwordHint")} type="password" autoComplete="new-password" />
      <TextField form={form} name="confirm" label={t("confirmPassword")} type="password" autoComplete="new-password" />
      <SubmitButton pending={pending} className="w-full">
        {t("updatePassword")}
      </SubmitButton>
    </form>
  );
}
