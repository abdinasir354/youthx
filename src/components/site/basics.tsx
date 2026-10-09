import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { markdownToSafeHtml } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** CMS Markdown → sanitized HTML. */
export function RichText({ markdown, className }: { markdown: string | null | undefined; className?: string }) {
  const html = markdownToSafeHtml(markdown);
  if (!html) return null;
  return <div className={cn("prose-cms text-base leading-[1.7] text-foreground/85 sm:text-[17px]", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Container({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-7xl", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold uppercase tracking-wider text-[#5f8500]", className)}>{children}</p>;
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
    <div className={cn("mb-6 flex flex-col gap-3 sm:mb-8", center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between")}>
      <div className={cn("max-w-3xl", center && "mx-auto")}>
        {eyebrow && <Eyebrow className={invert ? "text-primary" : undefined}>{eyebrow}</Eyebrow>}
        {heading && (
          <h2 id={id} className={cn("heading mt-2 text-balance text-2xl sm:text-3xl lg:text-[2.125rem]", invert ? "text-white" : "text-ink")}>
            {heading}
          </h2>
        )}
        {intro && <p className={cn("mt-2.5 text-pretty text-base leading-relaxed sm:text-lg", invert ? "text-white/80" : "text-muted-foreground")}>{intro}</p>}
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
      <ArrowRight className="size-4" aria-hidden />
    </SmartLink>
  );
}

/** Rounded "pill" buttons used across the public site. */
export const pill = {
  primary: "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-semibold text-secondary transition-colors hover:bg-primary-hover",
  dark: "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-5 text-[15px] font-semibold text-white transition-colors hover:bg-secondary-hover",
  outline: "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 text-[15px] font-semibold text-secondary transition-colors hover:border-secondary/40 hover:bg-muted",
  ghostLight: "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10",
};

/** Inner-page header: big headline on the warm off-white background, with soft moving shapes. */
export function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string | null; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-surface">
      <Container className="relative py-8 sm:py-10">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="display mt-2.5 max-w-4xl text-balance text-3xl text-ink sm:text-4xl lg:text-[2.75rem]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>}
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
