import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requireAdmin, requireRole, requireUser } from "@/lib/auth";
import type { Perm } from "@/lib/permissions";
import { Alert } from "@/components/ui/misc";
import type { UserRole } from "@/types/database.types";

/** Server-side re-check of the role (the proxy already checked; never trust a single layer). */
export async function RoleGate({ roles, adminPerm, requireApprovedMentor, children }: {
  roles?: UserRole[];
  adminPerm?: Perm;
  requireApprovedMentor?: boolean;
  children: ReactNode;
}) {
  const user = roles ? await requireRole(roles, adminPerm) : await requireUser();
  if (requireApprovedMentor && user.profile.role === "mentor" && !user.profile.is_mentor_approved) {
    const t = await getTranslations("mentor");
    return <Alert variant="warning">{t("notApproved")}</Alert>;
  }
  return <>{children}</>;
}

/** Back-office gate: non-admins get a 404. */
export async function AdminGate({ perm, children }: { perm?: Perm; children: ReactNode }) {
  await requireAdmin(perm);
  return <>{children}</>;
}
