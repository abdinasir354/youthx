"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { acceptApplication, closeOpportunity, setApplicationStatus } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/components/forms/use-action-form";
import type { ApplicationStatus } from "@/types/database.types";

/** Status buttons for one application. "Accept" always calls the database quota function. */
export function ReviewActions({ id, status }: { id: string; status: ApplicationStatus }) {
  const t = useTranslations("partner");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>, onOk?: (data: unknown) => void) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        onOk?.(res.data);
        router.refresh();
      } else toast.error(errorText(res.error));
    });
  }

  const accept = () =>
    run(
      () => acceptApplication(id),
      (result) => (result === "accepted" ? toast.success(t("resultAccepted")) : toast.warning(t("resultWaitlisted"))),
    );

  if (status === "withdrawn" || status === "accepted") return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "submitted" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setApplicationStatus(id, "under_review"))}>
          {t("review")}
        </Button>
      )}
      {status !== "shortlisted" && status !== "rejected" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setApplicationStatus(id, "shortlisted"))}>
          {t("shortlist")}
        </Button>
      )}
      {status !== "rejected" && (
        <Button size="sm" disabled={pending} onClick={accept}>
          {t("accept")}
        </Button>
      )}
      {status !== "rejected" && (
        <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => run(() => setApplicationStatus(id, "rejected"))}>
          {t("reject")}
        </Button>
      )}
    </div>
  );
}

export function CloseOpportunityButton({ id }: { id: string }) {
  const t = useTranslations("partner");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await closeOpportunity(id);
          if (res.ok) router.refresh();
          else toast.error(errorText(res.error));
        })
      }
    >
      {t("closeOpportunity")}
    </Button>
  );
}
