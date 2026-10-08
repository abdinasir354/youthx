import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Building2, ExternalLink } from "lucide-react";
import { getVerifiedPartners } from "@/lib/data/public";
import { PartnerRequestForm } from "@/components/forms/public-forms";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partners");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function PartnersPage() {
  const t = await getTranslations("partners");
  const tp = await getTranslations("partner.orgTypes");
  const partners = await getVerifiedPartners();
  return (
    <>
      <section className="bg-secondary py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-4xl font-extrabold">{t("title")}</h1>
          <p className="mt-2 text-white/80">{t("subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10">
        {partners.length === 0 ? (
          <EmptyState icon={Building2} title={t("noneTitle")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <article key={p.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary-soft">
                    {p.logo_url ? <Image src={p.logo_url} alt="" fill sizes="48px" className="object-contain" /> : <Building2 className="size-6 text-secondary" />}
                  </div>
                  <div>
                    <h2 className="font-bold text-secondary">{p.name}</h2>
                    {p.type && <Badge variant="outline">{tp(p.type as "ngo")}</Badge>}
                  </div>
                </div>
                {p.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline">
                    {t("visit")} <ExternalLink className="size-3.5" />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}

        <section id="become" className="mt-14 grid scroll-mt-24 gap-8 rounded-3xl bg-primary-soft p-6 sm:p-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="text-3xl font-extrabold text-secondary">{t("becomeTitle")}</h2>
            <p className="mt-3 text-secondary/80">{t("becomeText")}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <PartnerRequestForm />
          </div>
        </section>
      </div>
    </>
  );
}
