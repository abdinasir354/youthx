"""Verify every literal translation key used in src/ exists in the messages files.

English (the live language) must be complete. Somali is switched off for now (see
src/i18n/routing.ts), so keys missing from so.json are reported as a to-do list for the
translator instead of failing the check. Pass --strict to require both languages.

Usage:  python scripts/check-messages.py [--strict]
"""
import json
import pathlib
import re
import sys

STRICT = "--strict" in sys.argv
LIVE = ["en"]
LATER = ["so"]

msgs = {loc: json.load(open(f"src/messages/{loc}.json", encoding="utf-8")) for loc in LIVE + LATER}


def has(d, path):
    for part in path.split("."):
        if not isinstance(d, dict) or part not in d:
            return False
        d = d[part]
    return True


def flat(d, prefix=""):
    out = set()
    for k, v in d.items():
        out |= flat(v, f"{prefix}{k}.") if isinstance(v, dict) else {f"{prefix}{k}"}
    return out


DECL = re.compile(r'const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*(?:"([\w.]*)")?\s*\)')
DECL_ARRAY = re.compile(r'\[([^\]]*?)\]\s*=\s*await Promise\.all\(\[([^\]]*)\]\)', re.S)
missing = {loc: set() for loc in msgs}


def add_uses(src, f, decls):
    for var in {d[1] for d in decls}:
        for use in re.finditer(r"\b" + var + r'\(\s*"([\w.]+)"', src):
            before = [d for d in decls if d[1] == var and d[0] < use.start()]
            if not before:
                continue
            ns = before[-1][2]
            full = f"{ns}.{use.group(1)}" if ns else use.group(1)
            for loc, d in msgs.items():
                if not has(d, full):
                    missing[loc].add(f"{full}  ({f.as_posix()})")


for f in pathlib.Path("src").rglob("*.tsx"):
    src = f.read_text(encoding="utf-8")
    decls = [(m.start(), m.group(1), m.group(2) or "") for m in DECL.finditer(src)]
    # const [a, b, t] = await Promise.all([..., getTranslations("site")])
    for m in DECL_ARRAY.finditer(src):
        names = [n.strip() for n in m.group(1).split(",")]
        calls = [c.strip() for c in re.split(r",(?![^()]*\))", m.group(2))]
        for name, call in zip(names, calls):
            g = re.match(r'getTranslations\(\s*"([\w.]*)"\s*\)', call)
            if g and re.match(r"^\w+$", name):
                decls.append((m.start(), name, g.group(1)))
    add_uses(src, f, decls)

failed = False
for loc in LIVE:
    for m in sorted(missing[loc]):
        print(f"MISSING {loc}: {m}")
        failed = True
for loc in LATER:
    extra = flat(msgs["en"]) - flat(msgs[loc])
    if STRICT:
        for k in sorted(extra):
            print(f"MISSING {loc}: {k}")
        failed = failed or bool(extra)
    elif extra:
        print(f"note: {len(extra)} key(s) still to translate into '{loc}' (run with --strict to list them)")

if not failed:
    print("All translation keys OK")
sys.exit(1 if failed else 0)
