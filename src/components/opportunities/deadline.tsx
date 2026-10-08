"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

/**
 * The date is rendered on the server (static); the "N days left" countdown is computed in the
 * browser after hydration so cached pages never depend on the server's clock.
 */
export function Deadline({ value, className }: { value: string | null; className?: string }) {
  const t = useTranslations("opportunities");
  const locale = useLocale();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!value) return;
    const update = () => setDaysLeft(Math.floor((new Date(value).getTime() - Date.now()) / 86_400_000));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [value]);

  if (!value) return <span className={cn("text-xs text-muted-foreground", className)}>{t("noDeadline")}</span>;
  const closed = daysLeft != null && daysLeft < 0;
  const urgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", closed ? "text-danger" : urgent ? "font-semibold text-warning" : "text-muted-foreground", className)}>
      <CalendarClock className="size-3.5" />
      {formatDate(value, locale)}
      {daysLeft != null && <> · {closed ? t("closed") : t("daysLeft", { count: daysLeft })}</>}
    </span>
  );
}
