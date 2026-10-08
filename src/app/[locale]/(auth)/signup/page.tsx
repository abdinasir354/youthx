import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "@/components/forms/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signup") };
}

export default function SignupPage() {
  const t = useTranslations("auth");
  return (
    <>
      <h1 className="text-2xl font-extrabold text-secondary">{t("signupTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("signupSubtitle")}</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-secondary underline-offset-4 hover:underline">
          {t("login")}
        </Link>
      </p>
    </>
  );
}
