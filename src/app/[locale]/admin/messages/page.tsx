import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate } from "@/lib/utils";
import { setMessageRead } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/controls";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { ContactMessage } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("messages"), robots: { index: false } };
}

export default async function AdminMessagesPage() {
  await requireAdmin("inbox");
  const t = await getTranslations("admin");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.from("contact_messages").select("*").order("is_read").order("created_at", { ascending: false }).limit(300);
  const messages = (data as ContactMessage[]) ?? [];

  return (
    <div className="max-w-4xl">
      <PageHeader title={t("messages")} />
      {messages.length === 0 ? (
        <EmptyState icon={Mail} title={common("noResults")} />
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={cn("rounded-2xl border bg-white p-5 shadow-sm", m.is_read ? "border-border" : "border-primary")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-secondary">{m.subject || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.name}
                    {m.email && <> · <a href={`mailto:${m.email}`} className="underline">{m.email}</a></>}
                    {m.phone && <> · <a href={`tel:${m.phone}`} className="underline">{m.phone}</a></>}
                    {" · "}{formatDate(m.created_at, locale)}
                  </p>
                </div>
                <ActionButton action={setMessageRead.bind(null, m.id, !m.is_read)} variant="ghost">
                  {m.is_read ? t("markUnread") : t("markRead")}
                </ActionButton>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
