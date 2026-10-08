import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/public-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default function ContactPage() {
  const t = useTranslations("contact");
  const footer = useTranslations("footer");
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-4xl font-extrabold text-secondary">{t("title")}</h1>
        <p className="mb-8 mt-2 text-muted-foreground">{t("subtitle")}</p>
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <ContactForm />
        </div>
      </div>
      <aside className="h-fit rounded-2xl bg-secondary p-6 text-white">
        <h2 className="text-lg font-bold">{t("officeTitle")}</h2>
        <ul className="mt-4 space-y-4 text-sm text-white/85">
          <li className="flex gap-3"><MapPin className="size-5 shrink-0 text-primary" />{footer("address")}</li>
          <li className="flex gap-3"><Phone className="size-5 shrink-0 text-primary" /><a href="tel:+252610000000">+252 61 000 0000</a></li>
          <li className="flex gap-3"><Mail className="size-5 shrink-0 text-primary" /><a href="mailto:info@youthup.so">info@youthup.so</a></li>
          <li className="flex gap-3"><Clock className="size-5 shrink-0 text-primary" />{t("hours")}</li>
        </ul>
      </aside>
    </div>
  );
}
