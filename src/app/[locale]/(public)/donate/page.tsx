import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { HeartHandshake, Smartphone, Landmark } from "lucide-react";
import { DonationForm } from "@/components/forms/public-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("donate");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default function DonatePage() {
  const t = useTranslations("donate");
  return (
    <>
      <section className="bg-secondary py-14 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <HeartHandshake className="size-10 text-primary" />
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/80">{t("subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-secondary">{t("howTitle")}</h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("howText")}</p>
          <DonationForm />
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-primary-soft p-5">
            <ul className="space-y-3 text-sm text-secondary">
              <li className="flex gap-2"><Smartphone className="size-4 shrink-0" />{t("evc")}</li>
              <li className="flex gap-2"><Smartphone className="size-4 shrink-0" />{t("zaad")}</li>
              <li className="flex gap-2"><Landmark className="size-4 shrink-0" />{t("bank")}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <ul className="space-y-3 text-sm font-medium text-secondary">
              <li>{t("impact1")}</li>
              <li>{t("impact2")}</li>
              <li>{t("impact3")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
