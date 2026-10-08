"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { bulkUpdateApplications } from "@/app/actions/admin";
import { AppStatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/misc";
import { useErrorText } from "@/components/forms/use-action-form";
import { formatDate } from "@/lib/utils";
import type { ApplicationStatus, Gender } from "@/types/database.types";

export type AdminAppRow = {
  id: string;
  status: ApplicationStatus;
  gender_snapshot: Gender;
  submitted_at: string;
  opportunity: { id: string; title: string } | null;
  applicant: { full_name: string; email: string | null; region: string | null } | null;
};

const BULK_STATUSES = ["under_review", "shortlisted", "accepted", "waitlisted", "rejected"] as const;

export function BulkApplications({ rows }: { rows: AdminAppRow[] }) {
  const t = useTranslations("admin");
  const ta = useTranslations("appStatus");
  const tg = useTranslations("gender");
  const common = useTranslations("common");
  const locale = useLocale();
  const errorText = useErrorText();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<(typeof BULK_STATUSES)[number]>("shortlisted");
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectable = rows.filter((r) => r.status !== "withdrawn" && r.status !== "accepted");
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));

  function apply() {
    start(async () => {
      const res = await bulkUpdateApplications({ ids: [...selected], status: target });
      if (!res.ok) return void toast.error(errorText(res.error));
      const r = res.data!;
      toast.success(target === "accepted" ? t("bulkResult", r) : common("success"));
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-3 shadow-sm">
        <span className="text-sm font-semibold text-secondary">{t("selected", { count: selected.size })}</span>
        <Select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className="h-9 w-48" aria-label={common("status")}>
          {BULK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ta(s)}
            </option>
          ))}
        </Select>
        <Button size="sm" disabled={pending || selected.size === 0} onClick={apply}>
          {pending && <Loader2 className="animate-spin" />}
          {target === "accepted" ? t("bulkAccept") : t("bulkUpdate")}
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <Checkbox
                aria-label={common("all")}
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))}
              />
            </Th>
            <Th>{t("applicant")}</Th>
            <Th>{t("opportunity")}</Th>
            <Th>{common("status")}</Th>
            <Th>{common("date")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={selected.has(r.id) ? "bg-primary-soft/50" : undefined}>
              <Td>
                <Checkbox
                  aria-label={r.applicant?.full_name ?? r.id}
                  checked={selected.has(r.id)}
                  disabled={r.status === "withdrawn" || r.status === "accepted"}
                  onChange={() => toggle(r.id)}
                />
              </Td>
              <Td>
                <p className="font-semibold text-secondary">{r.applicant?.full_name || r.applicant?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {tg(r.gender_snapshot)}
                  {r.applicant?.region && ` · ${r.applicant.region}`}
                </p>
              </Td>
              <Td>
                {r.opportunity && (
                  <Link href={`/partner/opportunities/${r.opportunity.id}/applicants`} className="text-secondary hover:underline">
                    {r.opportunity.title}
                  </Link>
                )}
              </Td>
              <Td><AppStatusBadge status={r.status} /></Td>
              <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.submitted_at, locale)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
