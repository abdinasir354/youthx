import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMentorRequests } from "@/lib/data/mentor";
import { formatDate } from "@/lib/utils";
import { MentorResponse } from "@/components/dashboard/mentorship-forms";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentor");
  return { title: t("requests"), robots: { index: false } };
}

export default async function MentorRequestsPage() {
  const user = await requireRole(["mentor"]);
  const t = await getTranslations("mentor");
  const tm = await getTranslations("mentorship");
  const te = await getTranslations("education");
  const locale = await getLocale();
  const requests = await getMentorRequests(user.id);

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("requests")} />
      {requests.length === 0 ? (
        <EmptyState icon={Inbox} title={t("noRequests")} />
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-secondary">{r.topic}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("from", { name: r.mentee?.full_name ?? "—" })}
                    {r.mentee?.region && ` · ${r.mentee.region}`}
                    {r.mentee?.education_level && ` · ${te(r.mentee.education_level as "none")}`} · {formatDate(r.created_at, locale)}
                  </p>
                </div>
                <Badge variant={r.status === "accepted" ? "secondary" : r.status === "pending" ? "warning" : "outline"}>{tm(`status_${r.status}`)}</Badge>
              </div>
              {r.message && <p className="mt-3 whitespace-pre-line rounded-xl bg-muted p-3 text-sm">{r.message}</p>}
              {r.response_message && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {tm("mentorReply")}: {r.response_message}
                </p>
              )}
              <div className="mt-3">
                <MentorResponse id={r.id} status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
