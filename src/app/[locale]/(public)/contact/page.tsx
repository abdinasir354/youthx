import { Suspense } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { getPage, getSettings } from "@/lib/data/cms";
import { SOCIAL_LABELS, SOCIAL_NETWORKS } from "@/lib/cms/settings";
import { Sections } from "@/components/cms/sections";
import { ContactForm } from "@/components/forms/contact-form";
import { Container } from "@/components/site/basics";
import { cmsPageMetadata } from "@/components/site/cms-page";
import { FloatingShapes, PhotoPlaceholder } from "@/components/site/shapes";
import { Skeleton } from "@/components/ui/misc";

export async function generateMetadata() {
  return cmsPageMetadata("contact", "Contact");
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const glass = "rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur-md";

/**
 * Contact: one large split card — a photo panel (headline, location, email, phone) beside a
 * minimal form. The panel's photo + headline come from the first "Hero" section of
 * Admin → Pages → Contact; contact details come from Site settings.
 */
export default async function ContactPage() {
  const [page, s, t] = await Promise.all([getPage("contact"), getSettings(), getTranslations("site")]);
  const sections = page?.sections ?? [];
  const hero = sections[0]?.type === "hero" ? sections[0].data : null;
  const rest = hero ? sections.slice(1) : sections;
  const photo = str(hero?.image_url);
  const heading = str(hero?.heading) ?? t("contactHeadline");
  const accent = str(hero?.heading_accent) ?? t("contactHeadlineAccent");
  const city = s.address?.split(/[\n,]/)[0]?.trim();
  const socials = SOCIAL_NETWORKS.filter((n) => s.social?.[n]);
  const mapsUrl = s.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address.replace(/\s+/g, " "))}` : null;

  return (
    <>
      <section className="relative overflow-hidden bg-surface">
        <FloatingShapes variant="c" />
        <Container className="relative py-8 sm:py-10">
          <div className="grid overflow-hidden rounded-[2.75rem] bg-white shadow-[0_40px_90px_-50px_rgba(18,53,46,0.55)] lg:grid-cols-[1fr_1.1fr]">
            {/* Photo panel */}
            <div className="relative p-3">
              <div className="group relative flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-[2.25rem] p-6 text-white sm:p-7 lg:h-full">
                {photo ? (
                  <Image src={photo} alt={str(hero?.image_alt) ?? ""} fill preload sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.04]" />
                ) : (
                  <PhotoPlaceholder className="absolute inset-0" />
                )}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
                {/* Notched corner */}
                <span aria-hidden className="absolute left-0 top-0 size-16 rounded-br-[1.75rem] bg-white" />

                {city && (
                  <a
                    href={mapsUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${glass} absolute right-5 top-5 flex max-w-[16rem] items-start gap-2.5 px-4 py-2.5 text-left transition duration-300 ease-soft hover:bg-white/25`}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-sm font-bold">{s.site_name}</span>
                      <span className="block text-xs text-white/80">{s.address?.replace(/\s*\n\s*/g, " ")}</span>
                    </span>
                  </a>
                )}

                <div className="relative">
                  <p className="text-[0.8125rem] font-bold uppercase tracking-[0.24em] text-primary">{t("contactEyebrow")}</p>
                  <h1 className="display mt-2 text-balance text-3xl sm:text-4xl">
                    {heading} {accent && <em className="font-extrabold not-italic text-primary">{accent}</em>}
                  </h1>
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {s.contact_email && (
                      <a href={`mailto:${s.contact_email}`} className={`${glass} flex items-center gap-3 px-4 py-3 transition duration-300 ease-soft hover:bg-white/25`}>
                        <Mail className="size-5 shrink-0" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-white/75">{t("emailUs")}</span>
                          <span className="block truncate text-sm font-semibold">{s.contact_email}</span>
                        </span>
                      </a>
                    )}
                    {s.contact_phone && (
                      <a href={`tel:${s.contact_phone.replace(/\s/g, "")}`} className={`${glass} flex items-center gap-3 px-4 py-3 transition duration-300 ease-soft hover:bg-white/25`}>
                        <Phone className="size-5 shrink-0" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-white/75">{t("callUs")}</span>
                          <span className="block truncate text-sm font-semibold">{s.contact_phone}</span>
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex flex-col justify-center px-6 py-7 sm:px-10 sm:py-8 lg:px-12">
              <p className="text-base leading-relaxed text-muted-foreground">{page?.page.description ?? t("contactLead")}</p>
              <div className="mt-5">
                <Suspense fallback={<Skeleton className="h-96" />}>
                  <ContactForm />
                </Suspense>
              </div>
              {(socials.length > 0 || mapsUrl) && (
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {socials.map((n) => (
                    <a key={n} href={s.social[n]} target="_blank" rel="noopener noreferrer me" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink transition duration-300 ease-soft hover:-translate-y-0.5 hover:border-secondary/40">
                      {SOCIAL_LABELS[n]}
                    </a>
                  ))}
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="group/maps inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink transition duration-300 ease-soft hover:-translate-y-0.5 hover:border-secondary/40 [&>svg]:transition-transform [&>svg]:duration-300 hover:[&>svg]:-translate-y-0.5 hover:[&>svg]:translate-x-0.5">
                      {t("openMaps")} <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Sections sections={rest} />
    </>
  );
}
