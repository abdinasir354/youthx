"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="rounded-full bg-danger-soft p-4 text-danger">
        <AlertTriangle className="size-10" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold text-secondary">{t("errorTitle")}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t("errorText")}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">{error.digest}</p>}
      <div className="mt-8 flex gap-2">
        <Button onClick={reset}>{t("tryAgain")}</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {t("goHome")}
        </Link>
      </div>
    </main>
  );
}
