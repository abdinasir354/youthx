import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NavigationEditor, type NavItem } from "@/components/admin/cms/navigation-editor";
import { SectionTabs } from "@/components/admin/shell/section-tabs";
import { SETTINGS_TABS } from "@/components/admin/shell/nav";

export const metadata: Metadata = { title: "Navigation" };

export default async function AdminNavigationPage() {
  await requireAdmin("site");
  const supabase = await createClient();
  const { data } = await supabase.from("navigation_items").select("id, menu, label, href, position, is_visible, open_in_new_tab").order("position");
  return (
    <div>
      <SectionTabs tabs={SETTINGS_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Navigation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the menus shown on the website. Changes appear immediately.</p>
      </div>
      <NavigationEditor items={(data ?? []) as NavItem[]} />
    </div>
  );
}
