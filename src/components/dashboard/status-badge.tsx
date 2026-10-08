import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus, OpportunityStatus } from "@/types/database.types";

const APP_VARIANT: Record<ApplicationStatus, "default" | "secondary" | "outline" | "success" | "warning" | "danger"> = {
  submitted: "outline",
  under_review: "default",
  shortlisted: "default",
  accepted: "secondary",
  waitlisted: "warning",
  rejected: "danger",
  withdrawn: "outline",
};

export function AppStatusBadge({ status }: { status: ApplicationStatus }) {
  const t = useTranslations("appStatus");
  return <Badge variant={APP_VARIANT[status]}>{t(status)}</Badge>;
}

const OPP_VARIANT: Record<OpportunityStatus, "default" | "secondary" | "outline" | "warning" | "danger"> = {
  draft: "outline",
  pending_review: "warning",
  published: "secondary",
  closed: "default",
  archived: "outline",
};

export function OppStatusBadge({ status }: { status: OpportunityStatus }) {
  const t = useTranslations("oppStatus");
  return <Badge variant={OPP_VARIANT[status]}>{t(status)}</Badge>;
}
