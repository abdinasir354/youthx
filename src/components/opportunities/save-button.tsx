"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { toggleSaved } from "@/app/actions/applications";
import { Button } from "@/components/ui/button";

export function SaveButton({ opportunityId, initialSaved }: { opportunityId: string; initialSaved: boolean }) {
  const t = useTranslations("opportunities");
  const common = useTranslations("common");
  const [saved, setSaved] = useOptimistic(initialSaved);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setSaved(!saved);
          const res = await toggleSaved(opportunityId, !saved);
          if (!res.ok) toast.error(common("error"));
        })
      }
    >
      {saved ? <BookmarkCheck /> : <Bookmark />}
      {saved ? t("saved") : t("save")}
    </Button>
  );
}
