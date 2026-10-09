import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SectionRow } from "@/app/actions/cms";
import { requireAdmin } from "@/lib/auth";
import { loadRelations } from "@/lib/cms/admin-data";
import type { PageRecord } from "@/lib/cms/pages";
import { SECTION_TYPES, SECTIONS } from "@/lib/cms/sections";
import { canPublish } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageBuilder } from "@/components/admin/cms/page-builder";

export const metadata: Metadata = { title: "Edit page" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPagePage({ params }: PageProps<"/[locale]/admin/pages/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await requireAdmin("content");
  const supabase = await createClient();
  const [{ data: page }, { data: sections }, relations] = await Promise.all([
    supabase.from("pages").select("*").eq("id", id).maybeSingle(),
    supabase.from("page_sections").select("id, page_id, type, anchor, position, is_visible, data").eq("page_id", id).order("position"),
    // Option lists for hand-picked grid items, across all section types.
    loadRelations(supabase, SECTION_TYPES.flatMap((t) => SECTIONS[t].fields)),
  ]);
  if (!page) notFound();

  return <PageBuilder key={id} page={page as PageRecord} sections={(sections ?? []) as SectionRow[]} relations={relations} canPublish={canPublish(me.adminRole)} />;
}
