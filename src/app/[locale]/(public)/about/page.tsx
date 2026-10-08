import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Eye, Globe2, HeartHandshake, Scale, Target } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("metaTitle"), description: t("intro") };
}

const TEAM = [
  { name: "Hodan Abdi Warsame", role: "team1Role" },
  { name: "Mohamed Ali Farah", role: "team2Role" },
  { name: "Ifrah Hassan Nur", role: "team3Role" },
  { name: "Abdirahman Yusuf Osman", role: "team4Role" },
] as const;

export default function AboutPage() {
  const t = useTranslations("about");
  return (
    <>
      <section className="bg-secondary py-16 text-white">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{t("title")}</h1>
          <p className="mt-5 text-lg text-white/80">{t("intro")}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-6">
          <Target className="size-7 text-secondary" />
          <h2 className="mt-3 text-xl font-bold text-secondary">{t("missionTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("missionText")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-6">
          <Eye className="size-7 text-secondary" />
          <h2 className="mt-3 text-xl font-bold text-secondary">{t("visionTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("visionText")}</p>
        </div>
      </section>

      {/* 75/25 commitment */}
      <section className="bg-primary-soft py-14">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold text-secondary">{t("quotaTitle")}</h2>
            <p className="mt-3 text-secondary/80">{t("quotaText")}</p>
            <ul className="mt-5 space-y-3">
              {(["quotaPoint1", "quotaPoint2", "quotaPoint3"] as const).map((k) => (
                <li key={k} className="flex gap-2 text-secondary">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm" aria-hidden>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className={i < 15 ? "aspect-square rounded-full bg-secondary" : "aspect-square rounded-full bg-primary"} />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 text-center">
              <div>
                <p className="text-4xl font-extrabold text-secondary">75%</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold text-secondary/60">25%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-3xl font-extrabold text-secondary">{t("valuesTitle")}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: HeartHandshake, title: t("value1"), text: t("value1Text") },
            { icon: Globe2, title: t("value2"), text: t("value2Text") },
            { icon: Scale, title: t("value3"), text: t("value3Text") },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-white p-6">
              <span className="inline-flex rounded-xl bg-primary p-2.5 text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-3 font-bold text-secondary">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="text-3xl font-extrabold text-secondary">{t("teamTitle")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <li key={m.name} className="rounded-2xl border border-border bg-white p-5 text-center">
              <div aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary text-xl font-bold text-primary">
                {m.name
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")}
              </div>
              <p className="mt-3 font-bold text-secondary">{m.name}</p>
              <p className="text-sm text-muted-foreground">{t(m.role)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
