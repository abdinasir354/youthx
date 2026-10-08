"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Unread badge that updates in realtime via Supabase Realtime (RLS limits events to the user's own rows). */
export function NotificationBell({ userId }: { userId: string }) {
  const t = useTranslations("notifications");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count }) => active && setUnread(count ?? 0));

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setUnread((n) => n + 1);
        const row = payload.new as { title: string; body: string | null };
        toast(row.title, { description: row.body ?? undefined });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const was = payload.old as { is_read?: boolean };
        const now = payload.new as { is_read: boolean };
        if (now.is_read && was.is_read === false) setUnread((n) => Math.max(0, n - 1));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link href="/dashboard/notifications" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")} aria-label={`${t("title")}${unread ? ` (${unread})` : ""}`}>
      <Bell />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
