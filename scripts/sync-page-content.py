"""Copy supabase/content/pages.json into the initial-content migration (for new installs).

Rewrites the section list (and title/description, when given) of each page in
migrations/20261008000014_initial_content.sql. Then run scripts/bundle-migrations.py.

Usage:  python scripts/sync-page-content.py
"""
import json
import pathlib
import re

content = json.loads(pathlib.Path("supabase/content/pages.json").read_text(encoding="utf-8"))
mig = pathlib.Path("supabase/migrations/20261008000014_initial_content.sql")
sql = mig.read_text(encoding="utf-8")


def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


for slug, page in content.items():
    if slug.startswith("_"):
        continue
    pattern = re.compile(r"select pg_temp\.add_page\('" + re.escape(slug) + r"',\s*('(?:[^']|'')*'),\s*('(?:[^']|'')*'|null),(.*?)\$j\$.*?\$j\$::jsonb\);", re.S)
    m = pattern.search(sql)
    if not m:
        raise SystemExit(f"page {slug!r} not found in migration")
    title = q(page["title"]) if "title" in page else m.group(1)
    desc = q(page["description"]) if "description" in page else m.group(2)
    body = json.dumps(page["sections"], ensure_ascii=False, indent=2)
    new = f"select pg_temp.add_page('{slug}', {title}, {desc},{m.group(3)}$j${body}$j$::jsonb);"
    sql = sql[: m.start()] + new + sql[m.end():]
    print(f"synced {slug}")

mig.write_text(sql, encoding="utf-8")
