"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { cn, formatDate } from "@/lib/utils";
import type { Notification } from "@/types/database.types";

/** Live list: new rows arrive over Supabase Realtime. */
export function NotificationList({ userId, initial }: { userId: string; initial: Notification[] }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notification-list:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) =>
        setItems((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((n) => !n.is_read).length;

  function markAll() {
    start(async () => {
      const res = await markNotificationsRead();
      if (res.ok) setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  }

  if (items.length === 0) return <EmptyState icon={Bell} title={t("empty")} />;

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={markAll} disabled={pending}>
            <CheckCheck />
            {t("markAllRead")}
          </Button>
        </div>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {items.map((n) => (
          <li key={n.id} className={cn("flex items-start gap-3 p-4", !n.is_read && "bg-primary-soft/60")}>
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-secondary")} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-secondary">{n.title}</p>
                {!n.is_read && <Badge>{t("new")}</Badge>}
              </div>
              {n.body && <p className="text-sm text-foreground/80">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at, locale)}</p>
            </div>
            {n.link && (
              <Link
                href={n.link}
                className="shrink-0 text-sm font-semibold text-secondary hover:underline"
                onClick={() => !n.is_read && markNotificationsRead([n.id])}
              >
                {t("open")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
