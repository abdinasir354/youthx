import { useTranslations } from "next-intl";
import { Building2, Globe2, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/types/database.types";
import { Deadline } from "./deadline";

export function OpportunityCard({ opp }: { opp: Opportunity }) {
  const t = useTranslations("types");
  const common = useTranslations("common");
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-border bg-white p-5 transition-[translate,border-color] duration-[350ms] ease-soft hover:-translate-y-1 hover:border-secondary/30 focus-within:ring-2 focus-within:ring-primary">
      <div className="flex items-start justify-between gap-2">
        <Badge>{t(opp.type)}</Badge>
        {opp.is_remote && (
          <Badge variant="outline">
            <Globe2 className="size-3" />
            {common("remote")}
          </Badge>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-secondary">
        <Link href={`/opportunities/${opp.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {opp.title}
        </Link>
      </h3>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        {(opp.organization?.name || opp.organization_name) && (
          <p className="flex items-center gap-1.5">
            <Building2 className="size-4 shrink-0" aria-hidden />
            {opp.organization?.name ?? opp.organization_name}
          </p>
        )}
        {(opp.location || opp.region) && (
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {[opp.location, opp.region].filter(Boolean).join(", ")}
          </p>
        )}
      </div>
      {opp.summary && <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{opp.summary}</p>}
      <div className="mt-auto space-y-3 pt-4">
        <Deadline value={opp.apply_deadline} />
      </div>
    </article>
  );
}
