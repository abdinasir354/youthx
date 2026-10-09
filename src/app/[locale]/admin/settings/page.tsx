import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/cms/settings";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/cms/settings-form";
import { SectionTabs } from "@/components/admin/shell/section-tabs";
import { SETTINGS_TABS } from "@/components/admin/shell/nav";

export const metadata: Metadata = { title: "Site settings" };

export default async function AdminSettingsPage() {
  await requireAdmin("settings");
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const settings = { ...DEFAULT_SETTINGS, ...((data as Partial<SiteSettings> | null) ?? {}) };
  return (
    <div>
      <SectionTabs tabs={SETTINGS_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Site settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organization details, contact information, social links and defaults used across the website.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
