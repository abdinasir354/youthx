import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { setMentorApproved } from "@/app/actions/admin";
import { ActionButton, AdminRoleSelect, RoleSelect } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { ADMIN_ROLE_LABELS } from "@/lib/permissions";
import { USER_ROLES, type AdminRole, type Profile } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("users"), robots: { index: false } };
}

export default async function AdminUsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  const me = await requireAdmin("people");
  const { q, role } = (await searchParams) as { q?: string; role?: string };
  const t = await getTranslations("admin");
  const tr = await getTranslations("roles");
  const tg = await getTranslations("gender");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const isAdmin = me.adminRole === "super_admin";

  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (role && (USER_ROLES as string[]).includes(role)) query = query.eq("role", role);
  // Escape PostgREST filter syntax characters before using the search term.
  const term = (q ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 80);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data } = await query;
  const users = (data as Profile[]) ?? [];
  // Back-office roles: only super admins can read every row (RLS).
  const { data: adminRows } = isAdmin ? await supabase.from("admin_users").select("user_id, role, is_active") : { data: [] };
  const adminRoles = new Map(((adminRows ?? []) as { user_id: string; role: AdminRole; is_active: boolean }[]).filter((a) => a.is_active).map((a) => [a.user_id, a.role]));

  return (
    <div>
      <PageHeader title={t("users")} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={t("searchUsers")} className="pl-9" aria-label={t("searchUsers")} />
        </div>
        <Select name="role" defaultValue={role ?? ""} className="w-40" aria-label={t("role")}>
          <option value="">{common("all")}</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>{tr(r)}</option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">{common("search")}</Button>
      </form>
      <Table>
        <thead>
          <tr>
            <Th>{common("name")}</Th>
            <Th>{t("role")}</Th>
            {isAdmin && <Th>Admin access</Th>}
            <Th>{common("region")}</Th>
            <Th>{t("joined")}</Th>
            <Th>{common("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <Td>
                <p className="font-semibold text-secondary">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                {u.gender && <p className="text-xs text-muted-foreground">{tg(u.gender)}</p>}
              </Td>
              <Td>
                {isAdmin ? <RoleSelect userId={u.id} role={u.role} disabled={u.id === me.id} /> : <Badge variant="outline">{tr(u.role)}</Badge>}
                {u.role === "mentor" && (
                  <Badge variant={u.is_mentor_approved ? "secondary" : "warning"} className="mt-1">
                    {u.is_mentor_approved ? t("mentorApproved") : t("pendingReview")}
                  </Badge>
                )}
              </Td>
              {isAdmin && (
                <Td>
                  {u.id === me.id ? (
                    <Badge variant="secondary">{ADMIN_ROLE_LABELS[me.adminRole]}</Badge>
                  ) : (
                    <AdminRoleSelect userId={u.id} role={adminRoles.get(u.id) ?? null} />
                  )}
                </Td>
              )}
              <Td>{u.region ?? "—"}</Td>
              <Td>{formatDate(u.created_at, locale)}</Td>
              <Td>
                {isAdmin && u.role === "mentor" && (
                  <ActionButton action={setMentorApproved.bind(null, u.id, !u.is_mentor_approved)}>
                    {u.is_mentor_approved ? t("revokeMentor") : t("approveMentor")}
                  </ActionButton>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
