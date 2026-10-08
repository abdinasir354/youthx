import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/misc";
import type { OpportunitySeats } from "@/types/database.types";

/** Women / men seat usage for reviewers (from the opportunity_seats view). */
export function QuotaProgress({ seats }: { seats: OpportunitySeats | null | undefined }) {
  const t = useTranslations("partner");
  const common = useTranslations("common");
  if (!seats) return null;
  if (seats.capacity == null) {
    return (
      <p className="text-sm text-muted-foreground">
        {common("unlimited")} · {common("women")}: {seats.female_accepted} {t("accepted")} · {common("men")}: {seats.male_accepted} {t("accepted")}
      </p>
    );
  }
  const rows = [
    { label: common("women"), accepted: seats.female_accepted, seats: seats.female_seats ?? 0, applied: seats.female_applied, bar: "bg-women", track: "bg-secondary-soft" },
    { label: common("men"), accepted: seats.male_accepted, seats: seats.male_seats ?? 0, applied: seats.male_applied, bar: "bg-men", track: "bg-primary-soft" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold text-secondary">{r.label}</span>
            <span className="text-muted-foreground">
              {r.accepted}/{r.seats} {t("accepted")} · {r.applied} {t("applied")}
            </span>
          </div>
          <Progress value={r.seats ? (r.accepted / r.seats) * 100 : 0} className={r.track} barClassName={r.bar} label={r.label} />
        </div>
      ))}
    </div>
  );
}
