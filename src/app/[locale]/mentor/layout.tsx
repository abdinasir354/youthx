import { useTranslations } from "next-intl";
import { Inbox, LayoutDashboard, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { RoleGate } from "@/components/dashboard/role-gate";

/** /mentor is for approved mentors (and admins). */
export default function MentorLayout({ children }: LayoutProps<"/[locale]/mentor">) {
  const t = useTranslations("mentor");
  return (
    <DashboardShell
      title={t("title")}
      nav={[
        { href: "/mentor", label: t("overview"), icon: <LayoutDashboard />, exact: true },
        { href: "/mentor/requests", label: t("requests"), icon: <Inbox /> },
        { href: "/dashboard/profile", label: t("profile"), icon: <UserRound /> },
      ]}
      gate={
        <RoleGate roles={["mentor"]} requireApprovedMentor>
          {children}
        </RoleGate>
      }
    />
  );
}
