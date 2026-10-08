import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { deletePost } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import type { Post } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("posts"), robots: { index: false } };
}

export default async function AdminPostsPage() {
  await requireAdmin("content");
  const t = await getTranslations("admin");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("id, kind, title, slug, is_published, published_at, created_at").order("created_at", { ascending: false });
  const posts = (data as Post[]) ?? [];

  return (
    <div>
      <PageHeader title={t("posts")}>
        <Link href="/admin/posts/new" className={buttonVariants()}>
          <Plus /> {t("newPost")}
        </Link>
      </PageHeader>
      {posts.length === 0 ? (
        <EmptyState title={common("noResults")} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("postFields.title")}</Th>
              <Th>{t("postFields.kind")}</Th>
              <Th>{common("status")}</Th>
              <Th>{common("date")}</Th>
              <Th>{common("actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <Td className="font-semibold text-secondary">{p.title}</Td>
                <Td>{p.kind === "story" ? t("postFields.story") : t("postFields.news")}</Td>
                <Td><Badge variant={p.is_published ? "secondary" : "outline"}>{p.is_published ? common("published") : common("draft")}</Badge></Td>
                <Td>{formatDate(p.published_at ?? p.created_at, locale)}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Link href={`/admin/posts/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{common("edit")}</Link>
                    <ActionButton action={deletePost.bind(null, p.id)} variant="ghost" className="text-danger" confirmText={`${common("delete")}: ${p.title}?`}>
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
