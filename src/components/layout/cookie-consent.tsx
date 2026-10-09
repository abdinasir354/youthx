"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cookie, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

export const CONSENT_COOKIE = "yx_consent";
export type Consent = "all" | "essential" | "rejected";
const OPEN_EVENT = "yx:cookie-settings";

function readConsent(): Consent | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  const v = m ? decodeURIComponent(m[1]) : null;
  return v === "all" || v === "essential" || v === "rejected" ? v : null;
}

function saveConsent(v: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${v}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("yx:consent", { detail: v }));
}

/**
 * Cookie banner: three clear choices, remembered for 12 months. Today the site only uses
 * essential cookies; the choice is recorded so optional cookies are never added without consent.
 */
export function CookieConsent() {
  const t = useTranslations("cookies");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Read the browser cookie after mount (never during server rendering).
    const show = () => setOpen(true);
    if (!readConsent()) show();
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  if (!open) return null;

  const choose = (v: Consent) => {
    saveConsent(v);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-text"
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-md"
    >
      <div className="relative rounded-xl border border-border bg-white p-6">
        <button
          type="button"
          onClick={() => choose("essential")}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-ink"
          aria-label={t("closeEssential")}
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-[#4d6b00]">
            <Cookie className="size-5" aria-hidden />
          </span>
          <h2 id="cookie-title" className="text-lg font-semibold text-ink">{t("title")}</h2>
        </div>
        <p id="cookie-text" className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {t("text")}{" "}
          <Link href="/cookies" className="font-semibold text-ink underline underline-offset-2">
            {t("policyLink")}
          </Link>
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => choose("all")} className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-secondary-hover sm:order-3">
            {t("acceptAll")}
          </button>
          <button type="button" onClick={() => choose("essential")} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-secondary/40 sm:order-2">
            {t("essentialOnly")}
          </button>
          <button type="button" onClick={() => choose("rejected")} className="h-10 rounded-lg px-4 text-sm font-semibold text-ink underline-offset-4 transition hover:underline sm:order-1">
            {t("rejectAll")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner so visitors can change their choice. */
export function CookieSettingsButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}
