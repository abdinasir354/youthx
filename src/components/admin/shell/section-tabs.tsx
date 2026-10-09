import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { AdminTab } from "./nav";
import { TabLinks } from "./tab-links";

/** Tabs for pages grouped under one sidebar item (only the ones this role may open). */
export async function SectionTabs({ tabs }: { tabs: AdminTab[] }) {
  const me = await requireAdmin();
  const visible = tabs.filter((t) => can(me.adminRole, t.perm));
  if (visible.length < 2) return null;
  return <TabLinks tabs={visible.map(({ href, label }) => ({ href, label }))} />;
}
