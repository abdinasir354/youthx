import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { loadEntry, loadRelations, newEntryValues } from "@/lib/cms/admin-data";
import { getCollection } from "@/lib/cms/collections";
import { canPublish } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { EntryEditor } from "@/components/admin/cms/entry-editor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/[collection]/[id]">): Promise<Metadata> {
  const { collection, id } = await params;
  const def = getCollection(collection);
  return { title: def ? (id === "new" ? `New ${def.singular.toLowerCase()}` : `Edit ${def.singular.toLowerCase()}`) : "Content" };
}

export default async function EntryPage({ params }: PageProps<"/[locale]/admin/[collection]/[id]">) {
  const { collection, id } = await params;
  const def = getCollection(collection);
  if (!def) notFound();
  const me = await requireAdmin(def.perm);
  const supabase = await createClient();
  const relations = await loadRelations(supabase, def.fields);

  if (id === "new") {
    return (
      <EntryEditor
        key="new"
        collection={def.key}
        id={null}
        initial={newEntryValues(def)}
        meta={{ status: def.statusSet === "none" ? null : "draft", is_visible: true }}
        relations={relations}
        canPublish={canPublish(me.adminRole)}
      />
    );
  }

  if (!UUID.test(id)) notFound();
  const entry = await loadEntry(supabase, def, id);
  if (!entry) notFound();

  return <EntryEditor key={id} collection={def.key} id={id} initial={entry.values} meta={entry.meta} relations={relations} canPublish={canPublish(me.adminRole)} />;
}
