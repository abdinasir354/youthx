import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { profileCompleteness } from "@/lib/profile";
import { AppStatusBadge } from "@/components/dashboard/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/misc";
import type { ApplicationStatus } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: apps }, { data: enrollments }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, submitted_at, opportunity:opportunities(title, slug)")
      .eq("applicant_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("enrollments")
      .select("course_id, completed_at, course:courses(title, slug, lessons(id))")
      .eq("user_id", user.id)
      .is("completed_at", null)
      .limit(3),
  ]);

  const { data: progress } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id);
  const doneSet = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const completeness = profileCompleteness(user.profile);

  type AppRow = { id: string; status: ApplicationStatus; submitted_at: string; opportunity: { title: string; slug: string } | null };
  type EnrollRow = { course_id: string; course: { title: string; slug: string; lessons: { id: string }[] } | null };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-secondary sm:text-3xl">{t("welcome", { name: user.profile.full_name || user.email || "" })}</h1>

      {completeness < 100 && (
        <Card className="border-primary bg-primary-soft">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h2 className="font-bold text-secondary">{t("completeProfileTitle")}</h2>
              <p className="mt-1 text-sm text-secondary/80">{t("completeProfileText")}</p>
              <Progress value={completeness} className="mt-3 bg-white" label={t("profileComplete", { percent: completeness })} />
              <p className="mt-1 text-xs font-semibold text-secondary">{t("profileComplete", { percent: completeness })}</p>
            </div>
            <Link href="/dashboard/profile" className={buttonVariants({ variant: "secondary" })}>
              {t("profile")} <ArrowRight />
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("recentApplications")}</CardTitle>
            <Link href="/dashboard/applications" className="text-sm font-semibold text-secondary hover:underline">
              {t("applications")}
            </Link>
          </CardHeader>
          <CardContent>
            {(apps as unknown as AppRow[] | null)?.length ? (
              <ul className="divide-y divide-border">
                {(apps as unknown as AppRow[]).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-secondary">{a.opportunity?.title}</p>
                      <p className="text-xs text-muted-foreground">{t("appliedOn", { date: formatDate(a.submitted_at, locale) })}</p>
                    </div>
                    <AppStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FileText} title={t("noApplications")} description={t("noApplicationsText")}>
                <Link href="/opportunities" className={buttonVariants({ size: "sm" })}>
                  {t("browse")}
                </Link>
              </EmptyState>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("continueLearning")}</CardTitle>
            <Link href="/dashboard/courses" className="text-sm font-semibold text-secondary hover:underline">
              {t("courses")}
            </Link>
          </CardHeader>
          <CardContent>
            {(enrollments as unknown as EnrollRow[] | null)?.length ? (
              <ul className="space-y-4">
                {(enrollments as unknown as EnrollRow[]).map((e) => {
                  const total = e.course?.lessons.length ?? 0;
                  const done = e.course?.lessons.filter((l) => doneSet.has(l.id)).length ?? 0;
                  return (
                    <li key={e.course_id}>
                      <Link href={`/courses/${e.course?.slug}`} className="font-medium text-secondary hover:underline">
                        {e.course?.title}
                      </Link>
                      <Progress value={total ? (done / total) * 100 : 0} className="mt-2" label={e.course?.title} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={BookOpen} title={t("noCourses")}>
                <Link href="/courses" className={buttonVariants({ size: "sm" })}>
                  {t("browseCourses")}
                </Link>
              </EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
