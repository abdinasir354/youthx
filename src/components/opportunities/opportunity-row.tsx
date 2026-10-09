import { useTranslations } from "next-intl";
import { ArrowRight, Globe2, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Opportunity } from "@/types/database.types";
import { Deadline } from "./deadline";

/** Job-board style row: who, what, where — and whether you can still apply. */
export function OpportunityRow({ opp }: { opp: Opportunity }) {
  const t = useTranslations("types");
  const ts = useTranslations("site");
  const org = opp.organization?.name ?? opp.organization_name ?? "Youthup Foundation";
  const where = [opp.location, opp.region].filter(Boolean).join(", ");
  const internal = opp.apply_mode === "internal";

  return (
    <article className="group relative flex flex-col gap-5 rounded-3xl border border-border bg-white p-6 transition-all hover:border-secondary/30 hover:shadow-[0_20px_40px_-24px_rgba(18,53,46,0.35)] focus-within:ring-2 focus-within:ring-primary sm:flex-row sm:items-center sm:gap-6 sm:p-7">
      <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-xl font-extrabold text-primary">
        {org.trim()[0]?.toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#4d6b00]">{t(opp.type)}</span>
          {opp.is_featured && <span className="rounded-full bg-[#fdebc8] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8a5a00]">{ts("featured")}</span>}
          {!internal && <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">{ts("externalBadge")}</span>}
        </div>
        <h3 className="heading mt-3 text-xl text-ink sm:text-2xl">
          <Link href={`/opportunities/${opp.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {opp.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted-foreground">
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
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
          {ts("view")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </article>
  );
}
