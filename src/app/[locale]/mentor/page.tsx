import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock, Inbox } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getMentorRequests } from "@/lib/data/mentor";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentor");
  return { title: t("title"), robots: { index: false } };
}

export default async function MentorOverview() {
  const user = await requireRole(["mentor"]);
  const t = await getTranslations("mentor");
  const d = await getTranslations("dashboard");
  const requests = await getMentorRequests(user.id);
  const count = (s: string) => requests.filter((r) => r.status === s).length;
  return (
    <div className="space-y-6">
      <PageHeader title={d("welcome", { name: user.profile.full_name })} description={t("title")}>
        <Link href="/mentor/requests" className={buttonVariants()}>
          {t("requests")}
        </Link>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("pending")} value={count("pending")} icon={Clock} />
        <StatCard label={t("accepted")} value={count("accepted")} icon={CheckCircle2} />
        <StatCard label={t("requests")} value={requests.length} icon={Inbox} />
      </div>
    </div>
  );
}
