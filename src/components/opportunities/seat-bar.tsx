import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/misc";
import type { SeatInfo } from "@/types/database.types";

/** "Women: 12/15 left · Men: 3/5 left" with two bars. Numbers come from public_seats() in the DB. */
export function SeatBar({ seats, compact = false }: { seats?: SeatInfo | null; compact?: boolean }) {
  const t = useTranslations("opportunities");
  const common = useTranslations("common");
  if (!seats || seats.capacity == null || seats.female_seats == null || seats.male_seats == null) {
    return <p className="text-xs font-medium text-muted-foreground">{common("unlimited")}</p>;
  }
  const fLeft = seats.female_left ?? 0;
  const mLeft = seats.male_left ?? 0;
  const label = t("seatsLeft", { femaleLeft: fLeft, femaleSeats: seats.female_seats, maleLeft: mLeft, maleSeats: seats.male_seats });

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5" aria-hidden>
        <Progress
          value={seats.female_seats ? ((seats.female_seats - fLeft) / seats.female_seats) * 100 : 100}
          className="h-1.5 flex-[3] bg-secondary-soft"
          barClassName="bg-women"
        />
        <Progress
          value={seats.male_seats ? ((seats.male_seats - mLeft) / seats.male_seats) * 100 : 100}
          className="h-1.5 flex-1 bg-primary-soft"
          barClassName="bg-men"
        />
      </div>
      <p className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>{label}</p>
    </div>
  );
}

export function SeatDetail({ seats }: { seats?: SeatInfo | null }) {
  const t = useTranslations("opportunities");
  const common = useTranslations("common");
  if (!seats || seats.capacity == null || seats.female_seats == null || seats.male_seats == null) {
    return <p className="text-sm font-medium text-secondary">{common("unlimited")}</p>;
  }
  const rows = [
    { label: t("seatsWomen"), left: seats.female_left ?? 0, total: seats.female_seats, bar: "bg-women", track: "bg-secondary-soft" },
    { label: t("seatsMen"), left: seats.male_left ?? 0, total: seats.male_seats, bar: "bg-men", track: "bg-primary-soft" },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold text-secondary">{r.label}</span>
            <span className="text-muted-foreground">{t("seatsOf", { left: r.left, total: r.total })}</span>
          </div>
          <Progress value={r.total ? ((r.total - r.left) / r.total) * 100 : 100} className={r.track} barClassName={r.bar} label={r.label} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">{t("quotaNote")}</p>
    </div>
  );
}
