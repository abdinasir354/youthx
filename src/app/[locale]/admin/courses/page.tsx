import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteCourse } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import type { Course } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("courses"), robots: { index: false } };
}

export default async function AdminCoursesPage() {
  await requireAdmin("content");
  const t = await getTranslations("admin");
  const tc = await getTranslations("courses");
  const common = await getTranslations("common");
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("*, lessons(count)").order("created_at", { ascending: false });
  const courses = (data as (Course & { lessons: { count: number }[] })[]) ?? [];

  return (
    <div>
      <PageHeader title={t("courses")}>
        <Link href="/admin/courses/new" className={buttonVariants()}>
          <Plus /> {t("newCourse")}
        </Link>
      </PageHeader>
      {courses.length === 0 ? (
        <EmptyState title={tc("noneTitle")} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("courseFields.title")}</Th>
              <Th>{t("courseFields.category")}</Th>
              <Th>{t("lessonsCol")}</Th>
              <Th>{common("status")}</Th>
              <Th>{common("actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <Td className="font-semibold text-secondary">{c.title}</Td>
                <Td>{c.category ?? "—"}</Td>
                <Td>{c.lessons?.[0]?.count ?? 0}</Td>
                <Td><Badge variant={c.is_published ? "secondary" : "outline"}>{c.is_published ? common("published") : common("draft")}</Badge></Td>
                <Td>
                  <div className="flex gap-1">
                    <Link href={`/admin/courses/${c.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{common("edit")}</Link>
                    <ActionButton action={deleteCourse.bind(null, c.id)} variant="ghost" className="text-danger" confirmText={`${common("delete")}: ${c.title}?`}>
                      {common("delete")}
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
