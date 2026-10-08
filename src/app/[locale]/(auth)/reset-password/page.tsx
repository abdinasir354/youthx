import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/forms/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("newPasswordTitle"), robots: { index: false } };
}

/** Reached from the password-reset email via /auth/callback, which signs the user in first. */
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-secondary">{t("newPasswordTitle")}</h1>
      <ResetPasswordForm />
    </>
  );
}
