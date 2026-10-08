import { useTranslations } from "next-intl";
import { BarChart3, BookOpen, Briefcase, Building2, FileText, Handshake, HeartHandshake, LayoutDashboard, Mail, Newspaper, ScrollText, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { AdminGate } from "@/components/dashboard/role-gate";

/** /admin is for staff and admins. Admin-only pages (roles, audit) re-check inside. */
export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const t = useTranslations("admin");
  return (
    <DashboardShell
      title={t("title")}
      nav={[
        { href: "/admin", label: t("overview"), icon: <LayoutDashboard />, exact: true },
        { href: "/admin/users", label: t("users"), icon: <Users /> },
        { href: "/admin/organizations", label: t("organizations"), icon: <Building2 /> },
        { href: "/admin/opportunities", label: t("opportunities"), icon: <Briefcase /> },
        { href: "/admin/applications", label: t("applications"), icon: <FileText /> },
        { href: "/admin/courses", label: t("courses"), icon: <BookOpen /> },
        { href: "/admin/posts", label: t("posts"), icon: <Newspaper /> },
        { href: "/admin/donations", label: t("donations"), icon: <HeartHandshake /> },
        { href: "/admin/messages", label: t("messages"), icon: <Mail /> },
        { href: "/admin/partner-requests", label: t("partnerRequests"), icon: <Handshake /> },
        { href: "/admin/reports", label: t("reports.title"), icon: <BarChart3 /> },
        { href: "/admin/audit", label: t("audit"), icon: <ScrollText /> },
      ]}
      gate={<AdminGate>{children}</AdminGate>}
    />
  );
}
