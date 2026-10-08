import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationList } from "@/components/dashboard/notification-list";
import { PageHeader } from "@/components/ui/misc";
import type { Notification } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("title"), robots: { index: false } };
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const t = await getTranslations("notifications");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} />
      <NotificationList userId={user.id} initial={(data as Notification[]) ?? []} />
    </div>
  );
}
