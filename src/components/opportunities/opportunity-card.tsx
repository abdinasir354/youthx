import { useTranslations } from "next-intl";
import { Building2, Globe2, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { Opportunity, SeatInfo } from "@/types/database.types";
import { Deadline } from "./deadline";
import { SeatBar } from "./seat-bar";

export function OpportunityCard({ opp, seats }: { opp: Opportunity; seats?: SeatInfo | null }) {
  const t = useTranslations("types");
  const common = useTranslations("common");
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Badge>{t(opp.type)}</Badge>
        {opp.is_remote && (
          <Badge variant="outline">
            <Globe2 className="size-3" />
            {common("remote")}
          </Badge>
        )}
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug text-secondary">
        <Link href={`/opportunities/${opp.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {opp.title}
        </Link>
      </h3>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        {opp.organization && (
          <p className="flex items-center gap-1.5">
            <Building2 className="size-4 shrink-0" />
            {opp.organization.name}
          </p>
        )}
        {opp.region && (
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" />
            {opp.region}
          </p>
        )}
      </div>
      {opp.summary && <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{opp.summary}</p>}
      <div className="mt-auto space-y-3 pt-4">
        <SeatBar seats={seats} compact />
        <Deadline value={opp.apply_deadline} />
      </div>
    </article>
  );
}
