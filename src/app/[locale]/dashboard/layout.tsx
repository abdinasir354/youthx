import { useTranslations } from "next-intl";
import { Bell, BookOpen, Bookmark, FileText, LayoutDashboard, Users, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { RoleGate } from "@/components/dashboard/role-gate";

/** /dashboard is open to any signed-in user. */
export default function DashboardLayout({ children }: LayoutProps<"/[locale]/dashboard">) {
  const t = useTranslations("dashboard");
  return (
    <DashboardShell
      title={t("title")}
      nav={[
        { href: "/dashboard", label: t("overview"), icon: <LayoutDashboard />, exact: true },
        { href: "/dashboard/profile", label: t("profile"), icon: <UserRound /> },
        { href: "/dashboard/applications", label: t("applications"), icon: <FileText /> },
        { href: "/dashboard/courses", label: t("courses"), icon: <BookOpen /> },
        { href: "/dashboard/saved", label: t("saved"), icon: <Bookmark /> },
        { href: "/dashboard/mentorship", label: t("mentorship"), icon: <Users /> },
        { href: "/dashboard/notifications", label: t("notifications"), icon: <Bell /> },
      ]}
      gate={<RoleGate>{children}</RoleGate>}
    />
  );
}
