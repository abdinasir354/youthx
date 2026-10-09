import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { MessageActions } from "@/components/admin/review/message-actions";
import type { ContactMessage } from "@/types/database.types";
import { SectionTabs } from "@/components/admin/shell/section-tabs";
import { MESSAGE_TABS } from "@/components/admin/shell/nav";

export const metadata: Metadata = { title: "Contact messages" };

const TYPES: Record<string, string> = { general: "General", partnership: "Partnership", programs: "Programs", media: "Media", other: "Other" };

export default async function AdminMessagesPage({ searchParams }: PageProps<"/[locale]/admin/messages">) {
  await requireAdmin("inbox");
  const { view, type } = (await searchParams) as { view?: string; type?: string };
  const archived = view === "archived";
  const supabase = await createClient();
  let q = supabase.from("contact_messages").select("*").eq("is_archived", archived).order("is_read").order("created_at", { ascending: false }).limit(200);
  if (type && TYPES[type]) q = q.eq("inquiry_type", type);
  const { data } = await q;
  const messages = (data as (ContactMessage & { inquiry_type: string; is_archived: boolean })[]) ?? [];
  const tab = (v: string, label: string) => (
    <Link
      href={v ? `/admin/messages?view=${v}` : "/admin/messages"}
      aria-current={(v === "archived") === archived ? "page" : undefined}
      className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", (v === "archived") === archived ? "border-secondary text-secondary" : "border-transparent text-muted-foreground hover:text-secondary")}
    >
      {label}
    </Link>
  );

  return (
    <div className="max-w-4xl">
      <SectionTabs tabs={MESSAGE_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Contact messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Messages from the Contact page. Reply by email or phone, then archive.</p>
      </div>
      <nav className="mb-4 flex gap-1 border-b border-border" aria-label="Inbox">
        {tab("", "Inbox")}
        {tab("archived", "Archived")}
      </nav>
      <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
        <Link href={archived ? "/admin/messages?view=archived" : "/admin/messages"} className={cn("rounded-full border px-3 py-1", !type ? "border-secondary bg-secondary text-white" : "border-border bg-white text-secondary")}>
          All types
        </Link>
        {Object.entries(TYPES).map(([k, v]) => (
          <Link key={k} href={`/admin/messages?${archived ? "view=archived&" : ""}type=${k}`} className={cn("rounded-full border px-3 py-1", type === k ? "border-secondary bg-secondary text-white" : "border-border bg-white text-secondary")}>
            {v}
          </Link>
        ))}
      </div>
      {messages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">{archived ? "No archived messages." : "Inbox zero — no messages."}</div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={cn("rounded-lg border bg-white p-5", m.is_read ? "border-border" : "border-l-4 border-l-primary border-y-border border-r-border")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-secondary">
                    {m.subject || "(no subject)"}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{TYPES[m.inquiry_type] ?? m.inquiry_type}</span>
                    {!m.is_read && <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-secondary">New</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.name}
                    {m.email && <> · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? "Your message to YouthX"}`)}`} className="underline">{m.email}</a></>}
                    {m.phone && <> · <a href={`tel:${m.phone}`} className="underline">{m.phone}</a></>}
                    {" · "}
                    {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Mogadishu" })}
                  </p>
                </div>
                <MessageActions id={m.id} isRead={m.is_read} archived={m.is_archived} />
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-foreground">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
