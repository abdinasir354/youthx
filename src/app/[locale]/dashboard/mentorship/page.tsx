import type { Metadata } from "next";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRound, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMentors } from "@/lib/data/public";
import { formatDate } from "@/lib/utils";
import { MentorRequestForm, CancelMentorshipButton } from "@/components/dashboard/mentorship-forms";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { MentorshipRequest } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentorship");
  return { title: t("title"), robots: { index: false } };
}

export default async function MentorshipPage() {
  const user = await requireUser();
  const t = await getTranslations("mentorship");
  const locale = await getLocale();
  const supabase = await createClient();
  const [mentors, { data }] = await Promise.all([
    getMentors(),
    supabase
      .from("mentorship_requests")
      .select("*")
      .eq("mentee_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  // Mentor names come from the public mentor directory (youth cannot read other profiles directly).
  const names = new Map(mentors.map((m) => [m.id, m.full_name]));
  const requests = ((data as MentorshipRequest[] | null) ?? []).map((r) => ({ ...r, mentorName: names.get(r.mentor_id) ?? "—" }));
  const pendingWith = new Set(requests.filter((r) => r.status === "pending").map((r) => r.mentor_id));

  return (
    <div className="space-y-10">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <section>
        <h2 className="mb-4 text-lg font-bold text-secondary">{t("myRequests")}</h2>
        {requests.length === 0 ? (
          <EmptyState icon={Users} title={t("noRequests")} />
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-secondary">{r.topic}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.mentorName} · {formatDate(r.created_at, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "accepted" ? "secondary" : r.status === "declined" ? "danger" : "outline"}>{t(`status_${r.status}`)}</Badge>
                    {r.status === "pending" && <CancelMentorshipButton id={r.id} />}
                  </div>
                </div>
                {r.response_message && (
                  <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm">
                    <span className="font-semibold text-secondary">{t("mentorReply")}: </span>
                    {r.response_message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-secondary">{t("findMentor")}</h2>
        {mentors.length === 0 ? (
          <EmptyState icon={Users} title={t("noMentors")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mentors
              .filter((m) => m.id !== user.id)
              .map((m) => (
                <article key={m.id} className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      {m.avatar_url ? (
                        <Image src={m.avatar_url} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <UserRound className="absolute inset-0 m-auto size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-secondary">{m.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{m.region}</p>
                    </div>
                  </div>
                  {m.bio && <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{m.bio}</p>}
                  {m.mentor_expertise.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {m.mentor_expertise.map((e) => (
                        <Badge key={e}>{e}</Badge>
                      ))}
                    </div>
                  )}
                  {m.mentor_availability && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("availability")}: {m.mentor_availability}
                    </p>
                  )}
                  <div className="mt-4">
                    {pendingWith.has(m.id) ? (
                      <Badge variant="outline">{t("alreadyRequested")}</Badge>
                    ) : (
                      <MentorRequestForm mentorId={m.id} />
                    )}
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
