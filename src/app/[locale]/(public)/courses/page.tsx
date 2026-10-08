import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookOpen, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPublishedCourses } from "@/lib/data/public";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("courses");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function CoursesPage() {
  const t = await getTranslations("courses");
  const courses = await getPublishedCourses();
  return (
    <>
      <section className="bg-secondary py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-4xl font-extrabold">{t("title")}</h1>
          <p className="mt-2 text-white/80">{t("subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10">
        {courses.length === 0 ? (
          <EmptyState icon={BookOpen} title={t("noneTitle")} description={t("noneText")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <article key={c.id} className="relative flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  {c.category && <Badge>{c.category}</Badge>}
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{c.language === "en" ? "English" : "Soomaali"}</span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-secondary">
                  <Link href={`/courses/${c.slug}`} className="after:absolute after:inset-0">
                    {c.title}
                  </Link>
                </h2>
                {c.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>}
                <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-secondary">
                  <PlayCircle className="size-4" />
                  {t("lessons", { count: c.lessons?.[0]?.count ?? 0 })}
                  {c.level && <span className="text-muted-foreground"> · {c.level}</span>}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
