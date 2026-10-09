import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { SeoTable } from "@/components/admin/cms/seo-table";
import { SectionTabs } from "@/components/admin/shell/section-tabs";
import { SETTINGS_TABS } from "@/components/admin/shell/nav";

export const metadata: Metadata = { title: "SEO" };

export default async function AdminSeoPage() {
  const me = await requireAdmin("site");
  const supabase = await createClient();
  const { data } = await supabase.from("pages").select("id, slug, title, status, seo_title, seo_description, og_image_url").order("is_system", { ascending: false }).order("title");
  return (
    <div>
      <SectionTabs tabs={SETTINGS_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">SEO</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How each page appears in Google and when shared. Programs, events, opportunities, projects, resources and stories have their own SEO fields in their editors.
          {can(me.adminRole, "settings") && (
            <>
              {" "}Site-wide defaults are in <Link href="/admin/settings" className="font-medium text-secondary underline">Site settings</Link>.
            </>
          )}
        </p>
      </div>
      <SeoTable pages={data ?? []} />
    </div>
  );
}
