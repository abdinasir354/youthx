import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/components/forms/auth-forms";
import { Skeleton } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("login"), robots: { index: false } };
}

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <>
      <h1 className="text-2xl font-extrabold text-secondary">{t("loginTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      {/* LoginForm reads ?next= from the URL → needs a Suspense boundary */}
      <Suspense fallback={<Skeleton className="h-64" />}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-secondary underline-offset-4 hover:underline">
          {t("signup")}
        </Link>
      </p>
    </>
  );
}
