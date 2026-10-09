import { useTranslations } from "next-intl";
import { ArrowRight, Globe2, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Opportunity } from "@/types/database.types";
import { Deadline } from "./deadline";

/** Job-board style row: who, what, where — and whether you can still apply. */
export function OpportunityRow({ opp }: { opp: Opportunity }) {
  const t = useTranslations("types");
  const ts = useTranslations("site");
  const org = opp.organization?.name ?? opp.organization_name ?? "YouthX Foundation";
  const where = [opp.location, opp.region].filter(Boolean).join(", ");
  const internal = opp.apply_mode === "internal";

  return (
    <article className="group relative flex flex-col gap-5 rounded-xl border border-border bg-white p-6 transition-colors hover:border-secondary/30 focus-within:ring-2 focus-within:ring-primary sm:flex-row sm:items-center sm:gap-6 sm:p-7">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary-soft text-base font-semibold text-secondary">
        {org.trim()[0]?.toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-[#4d6b00]">{t(opp.type)}</span>
          {opp.is_featured && <span className="rounded-md bg-[#fdebc8] px-2 py-0.5 text-xs font-medium text-[#8a5a00]">{ts("featured")}</span>}
          {!internal && <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">{ts("externalBadge")}</span>}
        </div>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">
          <Link href={`/opportunities/${opp.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {opp.title}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="font-semibold text-ink/80">{org}</span>
          {where && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {where}
            </span>
          )}
          {opp.is_remote && (
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="size-4" aria-hidden /> {ts("remote")}
            </span>
          )}
        </p>
        {opp.summary && <p className="mt-3 line-clamp-2 text-base leading-relaxed text-foreground/75">{opp.summary}</p>}
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-border pt-4 sm:w-52 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <Deadline value={opp.apply_deadline} className="text-sm" />
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          {ts("view")} <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </article>
  );
}
