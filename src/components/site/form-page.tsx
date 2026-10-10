import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/lib/data/cms";
import { cn } from "@/lib/utils";
import { Container } from "./basics";
import { FloatingShapes } from "./shapes";

export type InvolveKind = "volunteer" | "mentor" | "partner" | "sponsor";
const KINDS: InvolveKind[] = ["volunteer", "mentor", "partner", "sponsor"];

/**
 * Get Involved forms: a dark, sticky story panel (switch between the four ways to help, what
 * happens next, how to reach us) beside a large, calm form card.
 */
export async function FormPage({ current, eyebrow, title, description, back, steps, stepsTitle, children }: {
  current: InvolveKind;
  eyebrow: string;
  title: string;
  description: string;
  back: { href: string; label: string };
  steps: string[];
  stepsTitle: string;
  children: ReactNode;
}) {
  const [t, settings] = await Promise.all([getTranslations("involve"), getSettings()]);
  return (
    <section className="relative overflow-hidden bg-surface">
      <FloatingShapes variant="c" />
      <Container className="relative grid gap-8 py-10 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
        {/* Story panel */}
        <aside className="relative h-fit overflow-hidden rounded-[2.5rem] bg-ink p-8 text-white sm:p-11 lg:sticky lg:top-24">
          <FloatingShapes variant="a" />
          <div className="relative">
            <Link href={back.href} className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors duration-300 hover:text-primary [&>svg]:transition-transform [&>svg]:duration-300 hover:[&>svg]:-translate-x-1">
              <ArrowLeft className="size-4" aria-hidden /> {back.label}
            </Link>

            <nav aria-label={t("waysToHelp")} className="mt-7 grid grid-cols-2 gap-1.5 rounded-2xl bg-white/[0.06] p-1.5 ring-1 ring-white/10 sm:grid-cols-4">
              {KINDS.map((k) => (
                <Link
                  key={k}
                  href={`/get-involved/${k}`}
                  aria-current={k === current ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-center text-sm font-bold transition",
                    k === current ? "bg-primary text-ink shadow-sm" : "text-white/70 hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  {t(`tab.${k}`)}
                </Link>
              ))}
            </nav>

            <p className="mt-10 text-[0.8125rem] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
            <h1 className="display mt-4 text-balance text-4xl sm:text-5xl">{title}</h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-white/75">{description}</p>

            <h2 className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-white/50">{stepsTitle}</h2>
            <ol className="relative mt-5 space-y-6">
              <span aria-hidden className="absolute bottom-3 left-[0.9375rem] top-3 w-px bg-white/15" />
              {steps.map((s, i) => (
                <li key={i} className="relative flex gap-4">
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-ink" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="pt-1 text-base leading-relaxed text-white/85">{s}</span>
                </li>
              ))}
            </ol>

            {(settings.contact_email || settings.contact_phone) && (
              <div className="mt-10 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">{t("preferTalk")}</p>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  {settings.contact_email && (
                    <li>
                      <a href={`mailto:${settings.contact_email}`} className="link-underline inline-flex items-center gap-2 hover:text-primary">
                        <Mail className="size-4 text-primary" aria-hidden /> {settings.contact_email}
                      </a>
                    </li>
                  )}
                  {settings.contact_phone && (
                    <li>
                      <a href={`tel:${settings.contact_phone.replace(/\s/g, "")}`} className="link-underline inline-flex items-center gap-2 hover:text-primary">
                        <Phone className="size-4 text-primary" aria-hidden /> {settings.contact_phone}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Form card */}
        <div className="rounded-[2.5rem] border border-border bg-white p-7 shadow-[0_30px_60px_-40px_rgba(18,53,46,0.35)] sm:p-12">
          <h2 className="heading text-3xl text-ink">{t(`formTitle.${current}`)}</h2>
          <p className="mt-2 text-base text-muted-foreground">{t("formIntro")}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
            {t("privacyLead")}{" "}
            <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">
              {t("privacyLink")}
            </Link>
          </p>
        </div>
      </Container>
    </section>
  );
}
