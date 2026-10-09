// Replace the sections of the pages listed in supabase/content/pages.json on the live database.
// Saves a backup of the current sections first (supabase/content/backup-<timestamp>.json).
//
// Usage:  node scripts/apply-page-content.mjs            (all pages in the file)
//         node scripts/apply-page-content.mjs home about (only these)
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase URL / service key missing in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const content = JSON.parse(readFileSync("supabase/content/pages.json", "utf8"));
const only = process.argv.slice(2);
const slugs = Object.keys(content).filter((s) => !s.startsWith("_") && (!only.length || only.includes(s)));

// Create built-in pages that don't exist yet (e.g. added after the first install).
for (const slug of slugs) {
  const { data: exists } = await db.from("pages").select("id").eq("slug", slug).maybeSingle();
  if (!exists) {
    const spec = content[slug];
    const { error } = await db.from("pages").insert({ slug, title: spec.title ?? slug, description: spec.description ?? null, is_system: true, status: "published" });
    if (error) throw new Error(`${slug}: ${error.message}`);
    console.log(`${slug}: page created`);
  }
}

const backup = {};
for (const slug of slugs) {
  const { data: page, error } = await db.from("pages").select("id, title, description").eq("slug", slug).single();
  if (error) throw new Error(`${slug}: ${error.message}`);
  const { data: old } = await db.from("page_sections").select("type, anchor, position, is_visible, data").eq("page_id", page.id).order("position");
  backup[slug] = { title: page.title, description: page.description, sections: old };
}
const file = `supabase/content/backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(backup, null, 2));
console.log(`backup saved: ${file}`);

for (const slug of slugs) {
  const spec = content[slug];
  const { data: page } = await db.from("pages").select("id").eq("slug", slug).single();
  const patch = {};
  if (spec.title) patch.title = spec.title;
  if (spec.description) patch.description = spec.description;
  if (Object.keys(patch).length) await db.from("pages").update(patch).eq("id", page.id);
  const del = await db.from("page_sections").delete().eq("page_id", page.id);
  if (del.error) throw new Error(`${slug}: ${del.error.message}`);
  const rows = spec.sections.map((s, i) => ({ page_id: page.id, type: s.type, anchor: s.anchor ?? null, position: i, is_visible: s.is_visible ?? true, data: s.data ?? {} }));
  const ins = await db.from("page_sections").insert(rows);
  if (ins.error) throw new Error(`${slug}: ${ins.error.message}`);
  console.log(`${slug}: ${rows.length} sections`);
}

// Tell the running site to drop its cached copy of the pages (dev or production).
const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
try {
  const res = await fetch(`${site}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ tags: ["pages"] }),
  });
  console.log(res.ok ? `site cache refreshed (${site})` : `could not refresh ${site} (HTTP ${res.status}) — restart the site to see changes`);
} catch {
  console.log(`site not reachable at ${site} — changes appear after the next start`);
}
