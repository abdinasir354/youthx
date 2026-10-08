import { useTranslations } from "next-intl";
import { Briefcase, Building2, LayoutDashboard, PlusCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { RoleGate } from "@/components/dashboard/role-gate";

export default function PartnerLayout({ children }: LayoutProps<"/[locale]/partner">) {
  const t = useTranslations("partner");
  return (
    <DashboardShell
      title={t("title")}
      nav={[
        { href: "/partner", label: t("overview"), icon: <LayoutDashboard />, exact: true },
        { href: "/partner/organization", label: t("organization"), icon: <Building2 /> },
        { href: "/partner/opportunities", label: t("opportunities"), icon: <Briefcase />, exact: true },
        { href: "/partner/opportunities/new", label: t("newOpportunity"), icon: <PlusCircle /> },
      ]}
      gate={<RoleGate roles={["partner"]} adminPerm="people">{children}</RoleGate>}
    />
  );
}
