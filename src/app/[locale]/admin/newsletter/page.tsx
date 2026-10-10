import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { exportSubscribersCsv } from "@/app/actions/inbox";
import { CsvButton } from "@/components/admin/controls";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { SubscriberToggle } from "@/components/admin/review/subscriber-toggle";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterPage() {
  await requireAdmin("inbox");
  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("newsletter_subscribers").select("id, email, status, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
  ]);
  const rows = data ?? [];
  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count ?? 0} active subscriber(s). Every email you send must include an unsubscribe link; people can also unsubscribe from the website.
          </p>
        </div>
        <CsvButton action={exportSubscribersCsv} filename="youthup-subscribers.csv">Export CSV</CsvButton>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">No subscribers yet.</div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-secondary">{r.email}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{new Date(r.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</span>
              <StatusBadge status={r.status === "subscribed" ? "visible" : "hidden"} className="w-24 justify-center" />
              <SubscriberToggle id={r.id} subscribed={r.status === "subscribed"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
