import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { markdownToSafeHtml } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { FloatingShapes } from "./shapes";

/** CMS Markdown → sanitized HTML. */
export function RichText({ markdown, className }: { markdown: string | null | undefined; className?: string }) {
  const html = markdownToSafeHtml(markdown);
  if (!html) return null;
  return <div className={cn("prose-cms text-[1.0625rem] leading-[1.75] text-foreground/85 sm:text-lg", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Container({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-7xl", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[0.8125rem] font-bold uppercase tracking-[0.22em] text-[#5f8500]", className)}>{children}</p>;
}

/** Eyebrow + heading + intro, with an optional link aligned right on wide screens. */
export function SectionHeading({
  eyebrow,
  heading,
  intro,
  link,
  invert,
  center,
  id,
}: {
  eyebrow?: string | null;
  heading?: string | null;
  intro?: string | null;
  link?: { label: string; href: string } | null;
  invert?: boolean;
  center?: boolean;
  id?: string;
}) {
  if (!eyebrow && !heading && !intro && !link) return null;
  return (
    <div className={cn("mb-7 flex flex-col gap-4 sm:mb-9", center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between")}>
      <div className={cn("max-w-3xl", center && "mx-auto")}>
        {eyebrow && <Eyebrow className={invert ? "text-primary" : undefined}>{eyebrow}</Eyebrow>}
        {heading && (
          <h2 id={id} className={cn("heading mt-2 text-balance text-3xl sm:text-4xl lg:text-5xl", invert ? "text-white" : "text-ink")}>
            {heading}
          </h2>
        )}
        {intro && <p className={cn("mt-3 text-pretty text-lg leading-relaxed", invert ? "text-white/80" : "text-muted-foreground")}>{intro}</p>}
      </div>
      {link && <ArrowLink href={link.href} invert={invert} className="shrink-0">{link.label}</ArrowLink>}
    </div>
  );
}

export function isExternal(href: string) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

/** Internal links go through the locale-aware Link; external ones open safely in a new tab. */
export function SmartLink({ href, children, className, newTab }: { href: string; children: ReactNode; className?: string; newTab?: boolean }) {
  if (isExternal(href)) {
    const blank = newTab ?? /^https?:/i.test(href);
    return (
      <a href={href} className={className} {...(blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...(newTab ? { target: "_blank" } : {})}>
      {children}
    </Link>
  );
}

export function ArrowLink({ href, children, invert, className }: { href: string; children: ReactNode; invert?: boolean; className?: string }) {
  return (
    <SmartLink href={href} className={cn("group inline-flex items-center gap-2 text-base font-semibold", invert ? "text-primary" : "text-secondary", className)}>
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
    </SmartLink>
  );
}

/** Rounded "pill" buttons used across the public site. */
export const pill = {
  primary: "inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-secondary shadow-sm transition hover:bg-primary-hover hover:shadow-md",
  dark: "inline-flex h-14 items-center justify-center gap-2 rounded-full bg-secondary px-7 text-base font-bold text-white transition hover:bg-secondary-hover",
  outline: "inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-white px-7 text-base font-semibold text-secondary transition hover:border-secondary/40 hover:shadow-sm",
  ghostLight: "inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-base font-semibold text-white transition hover:bg-white/10",
};

/** Inner-page header: big headline on the warm off-white background, with soft moving shapes. */
export function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string | null; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-surface">
      <FloatingShapes variant="c" />
      <Container className="relative py-10 sm:py-14">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="display mt-3 max-w-4xl text-balance text-4xl text-ink sm:text-5xl lg:text-6xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{description}</p>}
        {children}
      </Container>
    </section>
  );
}

const DATE_TZ = "Africa/Mogadishu";
export function formatEventDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: DATE_TZ, ...opts }).format(new Date(iso));
}
export function formatLongDate(iso: string | null | undefined) {
  if (!iso) return "";
  return formatEventDate(iso, { day: "numeric", month: "long", year: "numeric" });
}
