"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Big "days left" figure for the opportunity pass. The server renders a neutral placeholder;
 * the browser computes the real value (so cached pages never depend on the server clock).
 */
export function Countdown({ deadline }: { deadline: string | null }) {
  const t = useTranslations("site");
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setMs(new Date(deadline).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return <p className="heading text-3xl text-primary">{t("rolling")}</p>;
  if (ms == null) return <p className="heading text-4xl text-white/30" aria-hidden>—</p>;
  if (ms <= 0) return <p className="heading text-4xl text-white/50">{t("closedShort")}</p>;

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return (
    <p className="flex items-baseline gap-2" role="timer" aria-live="off">
      {days > 0 ? (
        <>
          <span className="display text-5xl tabular-nums text-primary">{days}</span>
          <span className="text-lg font-semibold text-white/80">{t("daysLeft", { count: days })}</span>
        </>
      ) : (
        <>
          <span className="display text-5xl tabular-nums text-primary">{Math.max(1, hours)}</span>
          <span className="text-lg font-semibold text-white/80">{t("hoursLeft", { count: Math.max(1, hours) })}</span>
        </>
      )}
    </p>
  );
}
