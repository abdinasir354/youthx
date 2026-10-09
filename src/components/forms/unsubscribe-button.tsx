"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { unsubscribeNewsletter } from "@/app/actions/public-forms";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

/** A button (not a plain link), so email link-scanners can't unsubscribe people by accident. */
export function UnsubscribeButton({ token }: { token: string }) {
  const t = useTranslations("footer");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [pending, start] = useTransition();
  if (!token) return <Alert variant="warning" className="mt-8">{t("unsubscribeInvalid")}</Alert>;
  if (state === "done")
    return (
      <Alert variant="success" className="mt-8">
        <span className="flex items-center justify-center gap-2"><CheckCircle2 className="size-4" aria-hidden /> {t("unsubscribeDone")}</span>
      </Alert>
    );
  return (
    <div className="mt-8 space-y-4">
      <Button
        variant="secondary"
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await unsubscribeNewsletter(token);
            setState(res.ok ? "done" : "error");
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />} {t("unsubscribeButton")}
      </Button>
      {state === "error" && <Alert variant="danger">{t("unsubscribeError")}</Alert>}
    </div>
  );
}
