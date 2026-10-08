"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { so: "Soomaali", en: "English" };

type Props = { className?: string; inverted?: boolean };

/** Reads the current URL (runtime data on dynamic routes) → streams in behind Suspense. */
export function LanguageSwitcher(props: Props) {
  // Hidden while the site runs in a single language.
  if (routing.locales.length < 2) return null;
  return (
    <Suspense fallback={<Pill {...props} />}>
      <Switcher {...props} />
    </Suspense>
  );
}

/** Static placeholder with the same look, shown until the URL is known. */
function Pill({ className, inverted }: Props) {
  const locale = useLocale() as Locale;
  return (
    <div className={cn("flex items-center gap-1 rounded-full p-1 text-xs font-semibold", inverted ? "bg-white/10" : "bg-muted", className)} aria-hidden>
      <Globe className={cn("ml-1 size-3.5", inverted ? "text-white/70" : "text-muted-foreground")} />
      {(routing.locales as readonly Locale[]).map((l) => (
        <span key={l} className={cn("rounded-full px-2.5 py-1", l === locale ? "bg-primary text-primary-foreground" : inverted ? "text-white/80" : "text-muted-foreground")}>
          {l.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

function Switcher({ className, inverted }: Props) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    startTransition(() => {
      // pathname is locale-free; params keep dynamic segments ([slug] etc.) intact
      router.replace(
        // @ts-expect-error -- pathname + params always match the current route
        { pathname, params },
        { locale: next },
      );
    });
  }

  return (
    <div className={cn("flex items-center gap-1 rounded-full p-1 text-xs font-semibold", inverted ? "bg-white/10" : "bg-muted", className)} role="group" aria-label={t("language")}>
      <Globe className={cn("ml-1 size-3.5", inverted ? "text-white/70" : "text-muted-foreground")} aria-hidden />
      {(routing.locales as readonly Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={pending}
          aria-pressed={l === locale}
          lang={l}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            l === locale
              ? "bg-primary text-primary-foreground"
              : inverted
                ? "text-white/80 hover:text-white"
                : "text-muted-foreground hover:text-secondary",
          )}
        >
          {l.toUpperCase()}
          <span className="sr-only"> {LABELS[l]}</span>
        </button>
      ))}
    </div>
  );
}
