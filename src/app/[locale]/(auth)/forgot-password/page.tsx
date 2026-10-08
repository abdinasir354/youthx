import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("forgotTitle"), robots: { index: false } };
}

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  return (
    <>
      <h1 className="text-2xl font-extrabold text-secondary">{t("forgotTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("forgotSubtitle")}</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-secondary underline-offset-4 hover:underline">
          {t("login")}
        </Link>
      </p>
    </>
  );
}
