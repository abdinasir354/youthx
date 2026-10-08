"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCvUrl } from "@/app/actions/profile";

/** CVs are private: fetch a 60-second signed URL on click, never render a permanent link. */
export function CvLink({ path, label }: { path: string; label: string }) {
  const t = useTranslations("errors");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-semibold text-secondary underline underline-offset-4"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await getCvUrl(path);
          if (res.ok && res.data) window.open(res.data, "_blank", "noopener,noreferrer");
          else toast.error(t("forbidden"));
        })
      }
    >
      {pending && <Loader2 className="size-3 animate-spin" />}
      {label}
    </button>
  );
}
