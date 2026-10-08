"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { withdrawApplication } from "@/app/actions/applications";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/components/forms/use-action-form";

export function WithdrawButton({ id }: { id: string }) {
  const t = useTranslations("apply");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(t("withdrawConfirm"))) return;
        start(async () => {
          const res = await withdrawApplication(id);
          if (res.ok) {
            toast.success(t("withdrawn"));
            router.refresh();
          } else toast.error(errorText(res.error));
        });
      }}
    >
      {t("withdraw")}
    </Button>
  );
}
