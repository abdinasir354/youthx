import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/types/database.types";

/** The organization the current partner belongs to (first membership). */
export async function getMyOrganization(userId: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization:organizations(*)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return ((data as unknown as { organization: Organization | null } | null)?.organization) ?? null;
}
