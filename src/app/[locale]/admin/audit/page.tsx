import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import type { AuditEntry } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("audit"), robots: { index: false } };
}

/** Admin only (RLS "audit: admin read" also enforces this). */
export default async function AdminAuditPage() {
  await requireAdmin("settings");
  const t = await getTranslations("admin");
  const common = await getTranslations("common");
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*, actor:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data as (AuditEntry & { actor: { full_name: string; email: string | null } | null })[]) ?? [];

  return (
    <div>
      <PageHeader title={t("audit")} />
      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title={common("noResults")} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{common("date")}</Th>
              <Th>{t("actor")}</Th>
              <Th>{t("action")}</Th>
              <Th>{t("entity")}</Th>
              <Th>{t("details")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-xs">{new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)}</Td>
                <Td>{r.actor?.full_name || r.actor?.email || "system"}</Td>
                <Td className="font-mono text-xs">{r.action}</Td>
                <Td className="font-mono text-xs">
                  {r.entity}
                  <span className="block text-muted-foreground">{r.entity_id?.slice(0, 8)}</span>
                </Td>
                <Td className="max-w-xs break-all font-mono text-xs text-muted-foreground">{r.details ? JSON.stringify(r.details) : ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
