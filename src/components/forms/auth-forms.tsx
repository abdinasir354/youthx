"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { adminLogin } from "@/app/actions/auth";
import { loginSchema } from "@/lib/validations";
import { SubmitButton, TextField } from "./fields";
import { useActionForm } from "./use-action-form";

/** Back-office sign-in (the only sign-in on the site): email + password. */
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
