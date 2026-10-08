import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, Briefcase, Check, GraduationCap, Lightbulb, Users, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("programs");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default function ProgramsPage() {
  const t = useTranslations("programs");
  const programs = [
    { key: "education", icon: BookOpen, href: "/courses" },
    { key: "skills", icon: Wrench, href: "/opportunities?type=training", bullets: ["skillsDigital", "skillsBusiness", "skillsVocational"] },
    { key: "scholarships", icon: GraduationCap, href: "/opportunities?type=scholarship" },
    { key: "mentorship", icon: Users, href: "/dashboard/mentorship" },
    { key: "jobs", icon: Briefcase, href: "/opportunities?type=job" },
    { key: "entrepreneurship", icon: Lightbulb, href: "/opportunities?type=grant" },
  ] as const;

  return (
    <>
      <section className="bg-secondary py-14 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{t("title")}</h1>
          <p className="mt-3 text-lg text-white/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl space-y-5 px-4 py-14">
        {programs.map(({ key, icon: Icon, href, ...rest }) => (
          <article key={key} id={key} className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-6 sm:flex-row">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Icon className="size-6" />
            </span>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-secondary">{t(key)}</h2>
              <p className="mt-1 text-muted-foreground">{t(`${key}Text`)}</p>
              {"bullets" in rest && (
                <ul className="mt-3 space-y-1.5">
                  {rest.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-secondary">
                      <Check className="mt-0.5 size-4 shrink-0" />
                      {t(b)}
                    </li>
                  ))}
                </ul>
              )}
              <Link href={href} className={buttonVariants({ variant: "link" }) + " mt-2 h-auto px-0"}>
                {t("explore")} <ArrowRight />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
